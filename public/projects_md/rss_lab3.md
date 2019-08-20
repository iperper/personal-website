# Lab 3: Wall Following on the Racecar
Check out our lab briefing [here!](https://docs.google.com/presentation/d/1agcopjSAuf_mQv2IpsXPJf9ifs8L1GqqJtYS1GSlp0A/edit?usp=sharing)


## Purpose
Our team implemented a wall following algorithm for a racecar, as well as a safety controller to prevent any potential crashes if the algorithm fails. 

## Overview and Motivation
Our objective for this lab was to become comfortable writing programs for our racecar and to set the stage for more advanced tasks. The ability to follow a wall is an essential building block for navigation algorithms as it introduces basic path planning and motion control. For this reason, we programmed our racecar to follow a wall from a specified distance away. As our algorithms get more complicated, the environment becomes more hazardous, and our car starts moving faster, it is possible for our beloved - and expensive - racecar to crash. To avoid damage from bumping into obstacles, we have implemented a low-level safety controller that prevents the car from crashing. More specifically, it listens to the wall follower's commands and ensures that they are safe to execute. 


Moving forward, the wall-following abilities of our racecar will allow us to optimize performance, particularly for speed and turning corners. Additionally, our safety controller will be essential in ensuring that we do not harm our racecar; not only is the it expensive, but damage to the physical components may hinder performance. By having a fail-safe that we can trust, we create more room for experimentation without worrying about crashing if we code something incorrectly. Through this lab, we have become comfortable with the ROS environment, implemented a wall-following algorithm, and programmed a safety controller to protect our racecar from damage.
 
## Proposed Approach
### **Technical Approach - Wall Follower**


<img src="/images/rss/lab3/figure_1.png" alt="Figure 1">


The foundation for our wall following algorithm is proportional and derivative control (PD). This feedback control responds to racecar's distance from the wall and the angle formed between the car and the wall. The wall is estimated using linear regression on points found in a subsection of the lidar scan data (Figure 1).


The distance from the wall and angle of the car with respect to the wall are calculated from this line, and the difference between these values and the desired values is the error that is fed into the control algorithm (Equation 1). The distance error is the proportional term (P) and the angle is the derivative term (D). The angle is considered a derivative because it dictates the rate of change in distance from the wall.


The PD controller uses the following formula to calculate the steering angle.


$Steering Angle = K_p \cdot (error \ distance) + K_d \cdot (error \ angle) \ \ \ \ \ [1]$


We decided to implement this PD controller instead of a proportional integral derivative controller (PID) because although adding integral control corrected for some imperfections in the steering angle, it also increased overshoot and added integral windup (Figure 2).


<img src="/images/rss/lab3/figure_2.png" alt="Figure 2">


When we first moved from the race car simulation environment to the physical racecar, we ran into two main problems. 


<img src="/images/rss/lab3/figure_3.png" alt="Figure 3">


(1) The car followed lines that were not representative of the wall, causing wild oscillation. 


(2) When directly applying the simulation to real life, the regression lines were influenced by points outside the lidar's measurable range. This meant that the linear regression algorithm (from the scipy stats library) produced inaccurate lines (Figure 3).


<img src="/images/rss/lab3/figure_4.png" alt="Figure 4">


To correct this, we limited the points used for regression to those within 4.5 meters of the lidar. To minimize oscillations, we maintained the ratio of the proportional and derivative gains used in the simulation while experimentally testing smaller values until the oscillations minimized without compromising our ability to turn corners (Figure 4).


We also focused on deciding which portion of the LiDAR data was best for identifying the wall. While the range used in the simulation data, $\frac{pi}{30}$ to $\frac{pi}{16}$, worked well, we wanted to fine tune these values. After trying multiple ranges, we decided that $0$ to $\frac{pi}{16}$ provided the best performance. This range resulted in the race car turning tight corners the best (Figure 5).


<img src="/images/rss/lab3/figure_5.png" alt="Figure 5">


### **Technical Approach - Safety Controller**
If our wall follower algorithm fails, we need a safety controller to keep the racecar safe. Our safety controller operates by reading each high-level drive command, modifying it if the command is deemed unsafe, and publishing the modified command as a low-level drive command. Since our safety controller will be running for the rest of the labs, we want it to be robust to changes in speed, environment, and control systems. We also want to achieve a high standard of safety without limiting our car's abilities.


<img src="/images/rss/lab3/figure_6.png" alt="Figure 6">


Our initial brainstorming sessions produced three potential algorithms for our safety controller: the Best-Case Controller, the Commanded-Path Controller, and the Projected-Future Controller (Figure 6). The Best-Case controller stops the racecar if and only if there is no possible path the racecar could follow to escape collision. The Commanded-Path Controller calculates the distance to the next potential crash and limits the velocity so that the racecar is able to decelerate before crashing. The Projected-Future Controller computes where the car will be at some time in the future given and if there is a collision at that time the car stops.


We selected the Commanded-Path Controller based on its robustness and conservativeness. We preferred the Commanded-Path over the Best-Case Controller because we felt the Best-Case Controller was too optimistic. The Best-Case controller assumes that the car will pick the best possible future path, while in reality we are concerned with scenarios where the path planner malfunctions. We also preferred the Commanded-Path Controller over the Projected-Future Controller. Although the Projected-Future Controller has an advantage when it comes to simplicity, it lacks robustness in that it does not adjust its behavior for different speeds or deceleration rates. The Commanded-Path controller is able to take these into account, allowing for more accurate collision prediction.


<img src="/images/rss/lab3/figure_7.png" alt="Figure 7">


Here is an explanation for how the Commanded-Path Controller (Figure 7) computes the maximum safe speed for our racecar. First, we perform smoothing and filtering of the raw LIDAR data to minimize false positive detections. Then we compute the instantaneous center of rotation (ICR) from steering angle and chassis geometry. Finally, we trace out the path of both the front and the side of the racecar, recording the distance to the first collision with a lidar point. This distance is used to calculate the fastest possible speed that still allows the racecar to stop in time.


$Distance \ to \ Crash \ = \ R \cdot (\theta_p - \theta_c - \theta_o)$


$Max \ Safe \ Speed \ = \sqrt{2 \cdot deceleration \cdot distance \ to \ crash}$


<img src="/images/rss/lab3/figure_8.png" alt="Figure 8">


Our final safety controller algorithm includes two tunable parameters for flexibility. The first tunable parameter is the deceleration rate. This parameter can be adjusted when factors like the floor's coefficient of friction or the racecar's weight impact our ability to slow down. The second is a buffer distance which dictates how close the car can come to an obstacle before coming to a complete stop. In sum, our speed-limiting function computes the maximum speed our vehicle can drive at while still leaving enough room to decelerate to a complete stop before crashing. 


### **ROS Implementation**


<img src="/images/rss/lab3/figure_9.png" alt="Figure 9">


All of our systems run on a ROS publisher/subscriber architecture via four main topics: 


*/scan*		This topic contains the output of the Hokuyo Lidar


*/vesc/high_level/ackermann_cmd_mxu/output/navigation*	This topic is used by the wall follower to command the racecar to move.


*/vesc/low_level/ackermann_cmd_mux/input/safety*	This topic is used by the safety controller to override the wall follower if necessary.


*/vesc/low_level/ackermann_cmd_mux/input/teleop*	This topic is controlled by the remote control which can override all other commands.


The mux architecture is a new idea introduced in this lab.  At a basic level, mux is a built-in ROS node that can subscribe to a variety of topics and re-publish the topic of its choosing. In this case, the 6.141 TA's created a mux node that our controllers interface with, using the naming convention above. The purpose of the mux is to set priority levels for different control commands.  For example, the wall follower and safety controller publish to a /vesc/high_level/ topic and a /vesc/low_level topic, respectively. The "low level" commands have a higher priority so that the safety_controller can override the "high level" commands sent by the wall follower. Similarly, the teleop topic has even higher priority so that we can always override the car's movement with manual control.


The control system is shown more abstractly in the figure below.  The wall follower is the main code that moves the vehicle, making decisions based on the lidar data. The safety controller modifies the wall follower command if it deems the command unsafe. Manual input is used at the discretion of the drivers.


<img src="/images/rss/lab3/figure_10.png" alt="Figure 10">


## Experimental Evaluation
### **Testing Procedure** 
To test our wall following capabilities, we started the car parallel to the wall at the desired distance to see if it smoothly follows the wall. We noticed that we needed to tune the gains of our PD controller because the car wobbled about the desired path. After tuning the PD controller gains, we implemented more complex tests, starting the car at different distances and angles away from the wall, as well as testing its response at corners.


To test our safety controller, we tried to run the car into an obstacle at various speeds. We observed a jerky motion caused by the detection of obstacles that were not really there. This was due to the lidar detecting points on the racecar itself. To solve this problem, we limited the field of view of the safety controller. 


### **Results**


<img src="/images/rss/lab3/figure_11.png" alt="Figure 11">


The safety controller gives the racecar ample time to decelerate and come to a stop at  a threshold distance away from the obstacle ( 0.15 meters in this experiment). Once the racecar's distance from the wall decreases below this threshold, the safety controller reduces the speed to 0.


<img src="/images/rss/lab3/figure_12.png" alt="Figure 12">

<img src="/images/rss/lab3/figure_13.png" alt="Figure 13">

<img src="/images/rss/lab3/figure_14.png" alt="Figure 14">

<img src="/images/rss/lab3/figure_15.png" alt="Figure 15">


Overall, our racecar did well. It was able to follow all of the walls it was given, and was always able to recover from both wide and tight corners. For future improvements, we will aim to reduce the magnitude of the oscillations, as well as reducing the time it takes to reach a stable path.


## Lessons Learned
As this was our first full team project, we learned a lot about the racecar platform, and how to approach a lot of different problems. Perhaps the most important technical skill we all learned was how to keep our code organized on Github so that everyone can stay up to date. We also learned about how the racecar responds to driving commands, such as steering angle and velocity, and how that differs from the simulation. These lessons allowed us to effectively parallelize our work and modify the existing codebase as needed.


Aside from the racecar itself, we learned a lot about our teamwork capabilities. Our strengths lie in our brainstorming sessions and using effective code structure. When brainstorming, we bring in a wide variety of ideas, and are open to discussing the advantages and flaws with each design openly. When coding, we have agreed upon an effective coding style that readily explains itself through docstrings and easy to follow variable names. However, there are certainly improvements to be made. We found ourselves diving into complex solutions, rather than starting simple and working our way up through iteration. Also, we were not perfect at communicating some technical details about how different parts of the code behave, such as what types of data to transfer and how the code will behave with different edge cases. These are things we are actively addressing now and look forward to improving in the future.


## Future Work
In the future, we want to test our racecar's behavior under varying parameters, and document our experimental results for further improvements. Our wall follower and safety controller work well at slow speeds, but we have yet to test it at different velocities. In theory, our wall following algorithm should instruct the car to follow a wall at a high speed, and our safety controller should take over and prevent crashes no matter what speed we originally commanded. In addition, we will develop more qualitative results of our racecar's performance, such as recording the actual velocity versus the commanded velocity to find the actual acceleration of the racecar, as well as any delay times. This information will better predict the behavior of the vehicle and help analyze areas for improvement.

