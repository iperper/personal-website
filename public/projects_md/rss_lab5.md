# Lab 5: Localization
Check out our lab briefing [here!](https://docs.google.com/presentation/d/1g38-WnFajDqlyq1H3xd-y0lpeRSUw2Hqoziqrm-hbzE/edit?usp=sharing)

## 1 Overview and Motivation


Our team implemented a localization algorithm for an autonomous racecar, to enable robust state estimation using both sensor measurements and a known motion model.


When placed in a known environment, a robot still needs to figure out where it is in that environment. Localization is a method by which a robot can determine its orientation and position within a known environment. This capability is crucial for a robot when attempting to make decisions about future actions or paths to take. Localization is done by incorporating the information gathered from the sensors on the robot about the surrounding environment and its own motion in order to compute an accurate estimate of the location and orientation of the robot relative to the coordinate frame of the given map.


Computing the location and orientation of the robot within a map informs what drive commands are needed to reach a target. While previous labs have allowed the car to find certain attributes in an environment relative to itself, such as the wall and the cone, this will allow the car to find itself relative to the environment. When attempting to implement path planning algorithms, a robot will therefore be able to know its position relative to its final goal and devise an optimal path. With the racecar specifically, this will mean eventually being able to compute the optimal path ahead while racing in the basement of Stata.


## 2 Proposed Approach


The localization approach we used is divided up into two sections. Section 2.1 explains the algorithms we used for each part of the localization task. Then, section 2.2 gives an overview of the ROS implementation of these parts.


### 2.1 Technical Approach


Our approach to localizing the robot in its environment involves three main components: the motion model, the sensor model, and the particle filter. The motion model takes in odometry data, either from simulation or the actual robot, and outputs a cluster of particles that represent poses that the car could possibly occupy. Separately, the sensor model computes what the LIDAR scan data should look like for each pose in the cluster if the car was actually at that pose; it compares these model scans to actual LIDAR scan data and computes the probability of the car being in each position and orientation. Finally, the particle filter combines the results of the updated particles and computed probabilities to determine the most likely pose of the car. This pose estimation can be displayed on a map so we can estimate how accurate our implementation is on the robot. In simulation, we can calculate the error between where the car is and where it localizes to. The results of these tests will be discussed in the section 3 subsections. The rest of this section will detail each of the motion model, sensor model, and particle filter.


### 2.1.1 Motion Model


Often times we are not certain of the location of the racecar. The racecar may have been placed on the ground with a different orientation than expected, or may have drifted slightly while driving. One approach to this challenge is to consider many points where the racecar might be, and for each of these points, or particles, use exteroceptive sensors to determine the likelihood of it being the true position of the racecar. This models a distribution of where the racecar is likely to be, rather than assuming a single position with absolute certainty.


<img src="/images/rss/lab5/figure_3_1.png" alt="Figure 3.1">


One advantage of this method is that it accounts for the sensor errors. For instance, when the racecar is commanded to drive at 1 m/s, it may actually be driving at a faster or slower speed. By adding random noise to the motion of the particles, we can have particles traveling faster than 1 m/s, and others slower. This ensures that at least some of the particles are likely to be traveling in the true direction of the car, so we have a much better chance of tracking its true position.


To implement this randomized motion, the racecar begins by creating hundreds of particles, each with an x-y coordinate and a direction. The points can all start at the same position if the starting position is known, or they may be spread out to cover a range of starting positions. The code then listens to the odometry data coming from the cars proprioceptive sensors, such as the encoders for the steering angle and the forward velocity. These values are assigned to the particles, each with a random amount of noise added. This noisy data is then transformed into displacement, causing the particles to each move in roughly the same direction while slowly spreading out, indicating the increasing uncertainty of the position of the racecar. The particles are then used in the sensor model for evaluation and pruning.


<img src="/images/rss/lab5/figure_3_2.png" alt="Figure 3.2">


### 2.1.2 Sensor Model


The sensor model is needed to accurately handle the inherent LIDAR noise and error, which can results in the LIDAR returning distances to “points” such as those shown in figure 2.3.  Even though there is only one object, the LIDAR has a non-zero probability of returning other points such as overshoot the object, hitting a part of the car, or just another random point.


<img src="/images/rss/lab5/figure_3_3.png" alt="Figure 3.3">


The sensor model was designed to handle fast and efficient computation of the probability that a given LIDAR value is accurate, given the  previous position estimate and motion value of the car. Specifically, the model compares the LIDAR points observed by the car to the LIDAR points that should be observed if the car were at each of the particles in model.


Since each particle can have a large number of LIDAR values (~100 points) and there are sometimes hundreds of particles at a time, computing the probability of each lidar value every time requires significant time and computing power.
With 200 particles and 100 LIDAR beams per particle, computing the probability of each value separately (in a for loop) takes about 0.30 seconds.  Implementing the sensor model this way would limit the update rate of the sensor model to about 3 Hz if it were running on a laptop, which is too slow for real-time robotic control.

Thus, we decided on three key features to enable efficient sensor model computations:
- Precomputing the sensor model as a lookup table for a discrete range of possible LIDAR values.
- Downsample the laser scan such that fewer LIDAR points need to be compared on each pass.
- Implement all lookups using Numpy to ensure optimized computations.

Precomputing the model required discretizing a grid of possible ground truth values (zt*) and measured value pairs (zt) in the form (zt, zt*). For example, if the maximum expected LIDAR distance was 15 meters, we would create a matrix like the one in figure 2.4.


<img src="/images/rss/lab5/figure_3_4.png" alt="Figure 3.4">


Determining the resolution of the table was a tradeoff between speed and accuracy. However, the LIDAR itself only has a accuracy of 6 cm, so we created a lookup table with 5 cm resolution which bounds the accuracy of our computations at the accuracy of the hardware.  With a maximum range 75 meters, generating a table of probabilities from the (zt , zt*) pairs takes 0.65 seconds, but this only happens once when the car is turned on.


Additionally, each observed LIDAR point needs to be compared with a expected ground truth point. Thus, the number of beams per particle scales linearly with the number of LIDAR points that are used per calculation, which leads to a quadratic increase in the the size of the table. We downsample to 100 LIDAR points on each computation, which still provides enough comparison to get a good estimate of position.


<img src="/images/rss/lab5/table.png" alt=Table">


### 2.1.3 Particle Filter


The particle filter is structured to determine the most likely particle pose after utilizing the motion model and sensor model to generate particle positions and those particle positions respective probabilities. The particle positions and probabilities were fed into the numpy histogram built in to obtain weighted probability histograms. More specifically, three different weighted probability histograms for the x, y, and theta components of the particle poses were generated to determine the most likely particle pose. Once the three histograms were obtained, the peak bin for each histogram was taken as the most likely value range for that component of the particle pose; therefore, the peak bin boundaries were averaged to obtain a single value for the particular pose component. Below in figure 2.5 are examples of three histograms generated for the x, y, and theta components of the pose in the racecar simulation.


<img src="/images/rss/lab5/figure_3_5.png" alt="Figure 3.5">


This histogram method was chosen as the best way to obtain a representative particle pose, because it is more robust than averaging since it disregards outliers that can heavily skew the data. This histogram method also eliminates the issue of attempting to find a weighted average of circular values for the theta component of the particle pose.


In order to initialize meaningful particles once the racecar is placed somewhere within the map scope, we generate a random spread of particles around a clicked point, which 
generates an initial pose, in rviz to set an initialize "guess" of the robot's position and orientation. Before the robot begins to move and while the robot is moving, the pose will update to better line up the lidar scan data based on the probabilities generated by the sensor model which correspond to the possible positions created by the motion model (figure 2.6).


<img src="/images/rss/lab5/figure_3_6.png" alt="Figure 3.6">


The particle filter topic publishing rate is approximately 42 Hz when generating 200 particles with 100 LIDAR beams per particle. Therefore, the racecar pose is being published in real time (publishing rate of 20 Hz or faster). Having a publishing rate of 42 Hz means that if the car is traveling at 10 m/s, the estimated position will be around 25 cm behind the vehicle in the direction of travel, but this error can be minimized by inferring this lag based on current speed which causes pose estimates to be clustered in an area that closes this 25 cm gap.


### 2.2 ROS Implementation


The only rosnode implemented for this lab is the particle filter node, here named /particle_filter. Our particle filter node subscribes to the following topics, shown in figure 2.7:
/scan, which provides the most current LIDAR sensor data
/map, which provides a map of the domain
/odom, which provides the most current vehicle odometry data
/initialpose, which allows us to prescribe an initial pose using rviz


<img src="/images/rss/lab5/figure_3_7.png" alt="Figure 3.7">


The particle filter processes this data with the help of the sensor model and motion model, which are implemented as python imports rather than separate rosnodes. Finally, the particle filter publishes to the following topics:
/base_link, the most probable current pose
/particles, an array of the particles generated by the filter at a given time 
/base_link_pf, the most probable current pose (published for plotting during simulation)
/tf, which transforms between base_link and map frames according to the location of the car.


## 3 Experimental Evaluation


We tested our localization code in simulation and on the real racecar. Below, section 3.1 defines three scenarios we tested in simulation and the section provides numerical results and graphs for the error and convergence rates in each scenario. In simulation, we compared the estimated pose to the ground truth from the simulated odometry data.


The real racecar did not have a ground truth that we could compare our estimated pose to, so we relied on the rviz visualization of the inferred position in the known map. In section 3.2, we describe the scenarios that we tested and demonstrate the results of each.


### 3.1 Testing Procedure and Results: Simmulation


We gather empirical data on the performance of our localization algorithm in simulation, where we have access to the ground truth pose of the simulated car as well as pose estimate of our particle filter. We evaluate the performance of our localization algorithm in three different scenarios:


- Noise-free scenario: Evaluating localization in this setting allows us to verify the  performance of the system in ideal conditions. We use the joystick to drive the car around the entire stata basement map in simulation, and plot the estimated x, y, and angle pose variables against the ground truth values in figure 3.1:

<video width=50% autoplay loop>
	<source src="../images/rss/lab5/simulation_rviz-trimmed.webm" type="video/webm">
	<source src="../images/rss/lab5/simulation_rviz-trimmed.mp4" type="video/mp4">
</video>

<img src="/images/rss/lab5/figure_4_1.png" alt="Figure 4.1">


We observe that under the variety of conditions presented in the Stata basement map, our localization algorithm maintains a translational pose estimate within 0.1 meters of the ground truth and a quaternion rotational pose estimate within 0.1 of the ground truth. We believe these are adequate error margins for localization in a map of this scale.


The notable exception is when the x-position error of the car drifts to 0.6 meters between t = 45s and t = 50s.  During this time the car is traveling down a long, featureless hallway along the x-axis. In such a hallway, the LIDAR scan would appear nearly identical at any x-position, so it makes sense that our particle filter would have trouble localizing precisely in this portion of the map. As soon as the car observes the end of the hallway around t = 48s, we can see from the data that the accuracy of the localization estimate is quickly recovered as the particles are re-weighted to match this observation.


- Noisy odometry scenario: We add random gaussian noise to the odometry reading from the car before it is passed to the motion model. Evaluating localization in this setting allows us to verify the ability of the sensor model to correct odometry error. To test, we drove the car straight in simulation. Each time a motion model update occurred, noise is drawn from a Gaussian distribution and added to all pose variables independently. The localization error and localization convergence for varying levels of noise input are depicted in figure 3.2.


<img src="/images/rss/lab5/figure_4_2.png" alt="Figure 4.2">


Our data illustrates that small and moderate odometry noise levels of 0.01 and 0.1 had negligible impact on localization accuracy. This demonstrates that for these noise levels, our particle filter is able to correctly identify particles close to the true pose of the car despite errors in the odometry signal. For a noise level of 0.5, very large random errors predictably caused particles to stop appearing near the true pose of the car, resulting in an inability to re-localize effectively using sensor data.


We could improve the ability of the particle filter to localize in the face of higher noise levels by increasing the density and dispersion of particle generation; however, this would come at a cost of increased demand for computation. Based on the performance of our particle filter on our real vehicle, our noise tolerance on the order of 0.1 in all variables is sufficient for our system in practice.


- Initialization error scenario: We provide the car with an incorrect initial pose estimate. This allows us to observe the convergence behavior of our particle filter. We initialized the pose estimate at some translational x-distance from its true position and observed how quickly the estimated pose converged to the true pose. In each of the three trials illustrated in figure 3.3, the initial pose estimate was set to 1 meter in the x-direction from the true starting position of the car.


<img src="/images/rss/lab5/figure_4_3.png" alt="Figure 4.3">


### 3.2 Testing Procedure and Results: Real Racecar


To evaluate whether the car was localizing properly in the Stata Basement, we used rviz to visualize where the car was in four different scenarios. The first two scenarios were to test convergence when the car is moving or not moving. The last two scenarios were to test robustness to different speeds. 


In order to test the convergence of the estimated location of the car, we set the car in an initial, incorrect pose and set the velocity to zero. We did this to test whether the sensor model would be able to update the particle positions and estimate a best pose without any significant change in odometry data. Next, we drove the robot to see if convergence would be faster or slower compared to the unmoving robot. We found that at standstill, the pose did start converging toward the actual position (we visually examined the robot and simulation environment to determine this), but driving the robot helped it to converge faster, as seen in figure 3.4. These results mean that having changing exteroceptive information and noise, and therefore better possible poses, leads to a faster convergence.

<video autoplay loop>
	<source src="../images/rss/lab5/converge_gif.webm" type="video/webm">
	<source src="../images/rss/lab5/converge_gif.mp4" type="video/mp4">
</video>

Figure 3.4: Initially the pose drifts to better line up the LIDAR data with the map walls without moving the racecar. Once the racecar is driven, the LIDAR data coverges to the map walls much quicker and more accurately.


We tested the scan data of the car at two different speeds: 1 meter per second (mps) and 2.5mps. At the higher speed, the scan data does not always correspond to what the estimated pose is; this is especially apparent during sharp changes in angle, like when turning. The videos of the car localizing at 1mps and 2.5mps are shown in figure 3.5. The lower performance at high speeds means that our car is unable to estimate reasonable possible poses in the motion model when the odometry data changes drastically in a short amount of time. We could try adding more noise to our motion model, or possibly make noise dependent on velocity.

<video width=45% autoplay loop>
	<source src="/images/rss/lab5/slow_rviz.webm" type="video/webm">
	<source src="/images/rss/lab5/slow_rviz.mp4" type="video/mp4">
</video>

<video width=45% autoplay loop>
	<source src="/images/rss/lab5/normal_gif.webm" type="video/webm">
	<source src="/images/rss/lab5/normal_gif.mp4" type="video/mp4">
</video>

<video width=45% autoplay loop>
	<source src="/images/rss/lab5/fast_rviz_gif.webm" type="video/webm">
	<source src="/images/rss/lab5/fast_rviz_gif.mp4" type="video/mp4">
</video>

<video width=45% autoplay loop>
	<source src="/images/rss/lab5/fast_gif.webm" type="video/webm">
	<source src="/images/rss/lab5/fast_gif.mp4" type="video/mp4">
</video>

Figure 3.5: The first two videos show the racecar and the corresponding rviz environment when driving the racecar in the Stata basement at 1 mps. The last two videos show the racecar and the corresponding rviz environment when driving the racecar in the Stata basement at 2.5 mps.


## 4 Lessons Learned


While implementing Localization algorithms on the racecar we made minor improvements to our coding style that have improved our time efficiency as a team. These improvements include making sure everyone is using the same indentation style and making sure to continue writing self-explanatory code via comprehensive variable naming and docstrings. This lead to our final code having little to no syntactic bugs that needed to be addressed.


Integration of the motion model and sensor model with the particle filter, however, set us back due to an error with certain file dependencies. This was a good reminder for us to make sure all of our files are compiled and up-to-date when attempting to run our code.


We also implemented a simple, straight forward solution initially before diving into more complex approaches. This has improved our time-management drastically as a team, and has allowed us to implement working versions of our code earlier on with minimal bugs, rather than spending most of our week debugging complex solutions.


## 5 Future Work


Our robot was able to localize itself within a known environment given the odometry data and LIDAR scan, but in the future, we would like to implement Google Cartographer on the racecar. This would enable real-time simultaneous localization and mapping (SLAM) on our robot so that we could localize in an unknown environment. Although we started working on configuring the Cartographer installation, we were unable to finish running and testing it by the deadline.


In addition to adding SLAM capabilities, we would like to test our localization algorithm at different velocities. At speeds higher than 2.5mps (the highest value we tested), its possible that the particle distribution would not spread out as much as necessary, and selecting the most accurate pose would be more difficult. We predict that at higher speeds, we will need to incorporate more noise. Furthermore, we plan to profile our code using a flame graph to understand and visualize where our code can be optimized. We were able to run our code at 40 Hz and did not find it necessary to optimize yet, but this tool will be useful in future labs.

