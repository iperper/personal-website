# Lab 6: Trajectory Planning Using A\* and RRT\* 

Check out our lab briefing [here!](https://docs.google.com/presentation/d/1FpkqhaMZPgjhQMKjhx_KbGA0G4icPl7tX-i8JP-WhKk/edit?usp=sharing)


## 1 Overview and Motivations

Across the six labs of Robotics: Science and Systems (RSS), we have gradually endowed our robot with abilities that have enabled it to operate more autonomously with each passing week. Our architecture has been true to the one introduced in the second lecture of RSS, visualized in Figure 1. In the first and second labs, we developed software for the low-level control and actuation of our robot. In the third lab, we developed low-level signal processing for our robot in support of our safety controller. As we advanced to the fourth and fifth labs, we moved up towards increasing levels of abstraction and autonomy in our robot's perception systems, implementing computer vision and localization capabilities. In this, the sixth lab, we make a similar step towards abstraction and autonomy, but this time in our robot's decision-making capabilities.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image2.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />     Figure 1: The robot architecture introduced in Lecture 2 of RSS. The path planning system we implemented in lab 6 is a type of motion planning, a higher level of decision-making autonomy than we achieved in previous labs.</div>

Motion planning is an essential ability for nearly any robot whose goal is to actuate change in its own state or the state of the world. Motion planning enables an autonomous agent that perceives its own state and is given some goal to string together a series of low-level actuation commands and arrive at that goal efficiently and safely. We use motion planning for our task of racing through the Stata basement, and enable our robot to generate a well-specified race plan given only its initial and goal states. Motion planning also finds application in the field of robotics more broadly. Particularly valuable is the application of robot motion planning to high-dimensional configuration spaces, as in the grasping movements of manipulator arms and the motion of other complex mechanisms with many degrees of freedom.

## 2 Proposed Approach

The challenge our team faced in this lab was to plan and execute a path between two randomly assigned locations. This path is judged by two metrics: the time it takes to generate the path and the time it takes to drive along the path. The sum of these two times was used to rate the quality of our path planning algorithms, with shorter times being better.

Rather than focus on just one type of path planner, our team researched and tested two distinct types of path-finding algorithms. This allowed us to compare the strengths and weaknesses of each, and to select the best one for final use on the robot. Our two approaches were a search-based algorithm, A\*, and a sample-based algorithm, RRT\*.

### 2.1 Technical Approach

One challenge of search algorithms is how to handle the physical constraints of the robot. For instance, a shortest-distance path will turn corners as tightly as possible. If the width of the robot is not accounted for, then the robot will clip the wall as it tries to turn. To account for this, we ran our path-planning algorithms on a dilated map. A dilated map expands walls and obstacles, limiting the search space to places where the robot can safely move without hitting obstacles.

Another challenge is developing a cost function, which is used to assign weights for moving from one position to another. Ideally, the cost function would model the search metric. For this lab, that would mean that the cost function is the time it takes to move between two points. Unfortunately, calculating this time is difficult because it is hard to know the exact speed the robot will be traveling, how much slip the wheels will have, how well the robot will follow the path, etc. For this reason, we chose to use distance between points as the cost function. While not ideal, this is a good approximation of the cost of moving from one location to another, especially if running the car at a constant velocity.

With a dilated map computed and a cost function defined, we implemented and tested two types of algorithms: search-based and sample-based. Search-based approaches discretize the map into finite locations and connect these locations in a graph. A search is then performed on the graph. Sample-based approaches instead randomly sample points on the map and build a tree that expands outward from the starting location until the desired end location is found. We tested both types of algorithms to compare both the speed of the search and the type of path that each produces. We then implemented a pure pursuit algorithm to compute steering angles in order to drive along our path. Sections 2.1.1 and 2.1.2 describe the algorithms and results of A\* and RRT\* respectively, while section 2.1.3 explains the pure pursuit method we used to follow our planned trajectories. 

### 2.1.1 Search-based Planning

Search-based planning algorithms use graphical search methods in order to compute a trajectory between two locations. The input map for a search-based algorithm, therefore, must be a discretized grid representation of the map of the car's location. After considering the tradeoff between accuracy and computation time, we discretized the stata basement map with 20 pixel intervals. and every 20 pixels were defined as a point on the grid of pixels that the car was able to traverse to. Generally, the less pixels per discrete point that are assigned, the more precise the path can be; however, we determined that making the map more discretized than 20 pixel segments did not increase the efficiency of the planned path enough to outweigh the computational cost of running the algorithm with such a fine grid. 

The search algorithm implemented on the race car is A\*. Unlike other search-based algorithms, the defining feature of A\* is that it optimizes the path it searches for based on a goal destination, only exploring possible paths that will lead closer to the goal, and leaving other areas of unexplored. The method by which A\* does this is via a heuristic cost function dependent on the distance any single node is from the end node, in addition to a general cost function dependent on the distance it takes to get to the node from the start. The heuristic cost, or "Hcost", is defined as the euclidean distance between the node in question and the end node. The general cost, or "Gcost", is defined by the distance between the start node to the node in question. Figure 2 illustrates the logic of the A\* algorithm implemented. The inputs into the algorithm are a start and end node, a grid map, and a discretization size for the grid map. 


<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image6.png" width =80% class = "center" style="padding-bottom:0.1em;" />     Figure 2: Flow chart representation of the A* algorithm's logic. The algorithm begins by taking in a start node and feeding it into open list, which is a list of all of the nodes that we have seen/bordered, but not occupied. The node in this list with the minimum cost is then set as the current node, and for each child of that node, or the nodes that border that node, the algorithm goes through a series of steps to determine whether the child should be added to the open list. The algorithm terminates once the end path is reached and a path is generated.
</div>

After implementing A\*, we also tried to optimize it for traversability and time, but it was too computational taxing. One method by which the A\* algorithm implemented on the car could be improved is by modifying how the grid-based map input is discretized. Currently, the map is simply discretized into 2D x-y pixel locations. If the discretization had been expanded, however, into a 4D grid that also had the pose of the car and the velocity at any given location, only the children of each node that are physically possible to traverse would be considered; this would mean that the algorithm needs to  traverse less of the map grid. Furthermore, the cost functions could then be calculated based on the time (rather than distance) it takes to get from the start node and to reach the end node. A time-based cost function would be much more ideal for this lab as the goal is to have the racecar traverse the Stata basement loop as quickly as possible, not in the shortest distance possible. While this 4D grid would be ideal, it was found to be too computationally demanding, and would not have provided enough of a significant improvement in the path generated by A\*, at least for the application of looping through the Stata basement.


### 2.1.2 Sample-based Planning

In addition to A\*, we planned trajectories with a sample based algorithm called RRT\*, which is an extension to Rapidly-exploring Random Tree (RRT). First, we implemented RRT. To do this, we built a tree of paths rooted at our car's starting position. To add nodes to the tree, we sampled points from our environment and built branches in the direction of each point; we only added a branch if it was collision-free. Once a branch reached the destination region, we traced back up the parent nodes to construct the path. Figure 3 shows what our tree looked like after every 500 samples in simulation. The resulting path starts and ends as desired, but the path is jagged, hard-to-follow, and less than optimal. RRT by itself cannot find a more optimal path once a path is found, so we then implemented RRT\*. 


<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image7.png" width =80% class = "center" style="padding-bottom:0.1em;" />     Figure 3: RRT constructs a tree (yellow points, frames 1-3) through repeated sampling and expansion. Eventually, the tree grows into the goal region and a path is immediately returned (yellow line, frame 4). The final path contains evident jaggedness and is suboptimal.
</div>

For RRT\*, we added a cost function based on distance to modify how branches were added to our tree. The reason we used distance as the cost function was because it would give us the best approximation for time, while being easily computable given our current graph; a longer path takes longer to follow, and we did not have to factor in states such as velocity to determine that. When a node was about to be connected, we checked nearby nodes within a "K" distance away to pick which one, if connected to, would result in the shortest path from the root to the new node. Then, all nodes in that range were re-checked and re-wired to shorten paths if a better possible path was found. 

While writing both RRT and RRT\*, we had to determine the best step-size, or length of each branch. If the step size was large, the algorithm found simple paths quickly, but was unable to find non-collision branches if the path was complicated. Smaller step-sizes were more reliable, but added to the computation time. We settled on a step-size of 20 pixels, or approximately 1 meter. Figure 4 illustrates the difference in path selected by RRT and RRT\* respectively. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image15.png" width =80% class = "center" style="padding-bottom:0.1em;" />		Figure 4: The path generated by RRT is on the left, while the path generated by RRT* is on the right. RRT* plans a smoother and shorter path than RRT between the same start and goal points in the Stata basement. 
</div>


### 2.1.3 Pure Pursuit Controller

Our sample-based and search-based planning algorithms each output a set of points defining a piecewise linear trajectory. We designed and implemented a Pure Pursuit controller to follow this type of trajectory. The Pure Pursuit controller identifies a point on the trajectory ahead of the car at some look-ahead distance, and steers the car along an arc that intersects that point (Figure 5).

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image9.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />			Figure 5: Geometry of the Pure Pursuit controller. The controller computes a look-ahead path point at the prescribed distance and steers the car towards it.
</div>

The main design choice we made in our pure pursuit implementation was the selection of an appropriate look-ahead distance for our problem. In order to select an appropriate look-ahead distance, we evaluated the car’s cross-track error on a hand-drawn piecewise linear trajectory with several candidate look-ahead distance values. We found that for a look-ahead distance of 2.0 meters, the cross-track error was elevated, because the car did its steering based on a part of the path that was relatively distant from the car’s current location. For a look-ahead distance of 0.5 meters, we found that the racecar achieved low cross-track error but was susceptible to failure on tight corners because the controller would not begin to detect and follow the turn until it was too late to safely turn the corner. Figure 6 demonstrates the results of the described trials, and Video 1 visualizes our testing environment. We concluded that a look-ahead distance of 1.0 meter provided the best mix of low cross-track error and high robustness to corners in our simulated setting with a hand-drawn trajectory, and in section 3 we describe how we empirically validated that this look-ahead distance led to good performance in the real world.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image16.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />			Figure 6: We evaluated the effect of different look-ahead distances in the Pure Pursuit algorithm by tracking the Cross Track Error (XTE) to a planned path over the course of an entire simulated Stata basement loop. The longest look-ahead (2.0 m) resulted in higher XTE while the shortest look-ahead (0.5 m) lacked robustness around corners. A look-ahead of 1.0 m achieved both low error and robustness.</div>

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/hand.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Video 1: We demonstrate our pure pursuit controller following a hand-drawn piecewise linear trajectory with a look-ahead distance of 2.0 meters. We observed large Cross Track Error for at this look-ahead distance; this is because the car steers based on a section of the path far in the future and ignores closer path points.
</div>


### 2.2 ROS Implementation

Our ROS implementation consists of five rosnodes: the Map Server, Safety Controller, Particle Filter, Trajectory Builder and Trajectory Follower, which interact with each other and the vehicle sensors and actuators through ROS.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image11.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />			Figure 7: The RQT graph of our complete path planning ROS implementation.
</div>

The flow of data in our ROS implementation is as follows: The Trajectory Builder subscribes to clicked points and publishes a trajectory between those clicked points built by either A\* or RRT\*. The Trajectory Follower subscribes to the path planned by the trajectory builder as well as the localization estimate of the Particle Filter (see Lab 5) and uses Pure Pursuit to compute and publish an appropriate steering angle and velocity to a high-level drive topic. The Safety Controller then evaluates the safety of this command based on the raw LIDAR sensor data before publishing it as a low-level drive command.


## 3 Experimental Evaluation

We tested both of our path planning algorithms, A\* and RRT\*, as well as pure pursuit in simulation; on the real racecar, we tested only A\* and pure pursuit. Section 3.1 goes into depth on the test we performed in simulation to evaluate our sample-based and search-based path planning algorithms. The results of this test led us to decide to move forward with only our search-based algorithm, A\*, on the real racecar. 

In order to evaluate A\*'s performance on the real racecar, we relied on the pure pursuit distance error: the distance between the car's localized position and the closest point on the generated path. Ultimately, this is not a ground truth comparison since this metric includes localization error, but it gave us a good estimate of how easy-to-follow our A\* generated paths are in real life. Further evaluation was done by visually comparing the path the car followed in real life to the generated path visualized in RViz. In section 3.2, we go into depth on the real world test we performed and analyze a few videoes we took of the RViz and real racecar side by side.

Ultimately, the success metric of our racecar's performance is the ability to follow a path without crashing into obstacles, which our racecar is able to do at this point. However, after our real world quantitative evaluation, we concluded our racecar's path planning still needs future work to meet our desired performance for the full Stata basement loop. 


### 3.1 Testing Procedure and Results: Simulation 

In simulation we tested both algorithms using user-defined start and end point markers and evaluated the relative performance of the search-based and sample-based path planning algorithms using three different testing metrics: time needed to generate the path, path length, and pure pursuit error when following the path. The paths generated by the two algorithms can be seen in Videos 2 and 3. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/astar2pointspath.gif" width =80% class = "center" style="padding-bottom:0.1em;" />
</div>
<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/rrtstar_two_points.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Videos 2 and 3: The top video shows the path planned between two points by our search-based path planning algorithm A*, represented by green dots along the generated path. The bottom video similarly shows the path planned between two points by our sample-based path planning algorithm RRT*, with the green lines representing the generated path.
</div>

In Videos 4 and 5, a demonstration of the simulated car following these paths using the pure pursuit algorithm can be seen.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image5.gif" width =80% class = "center" style="padding-bottom:0.1em;" />
</div>
<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image10.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Videos 4 and 5: The top video shows the path planned by our search-based path planning algorithm A* being followed by the simulated racecar using our pure pursuit algorithm. The bottom video similarly shows the path planned by our sample-based path planning algorithm RRT*. The green point markers in both videos show the points chosen by the algorithms to generate their respective paths. The green lines show the line segment representations of the paths.
</div>

As mentioned earlier, one of our test metrics is the pure pursuit error when simulating following the path. This error is defined as the distance (m) between the position of the simulated racecar and the closest point on the path. For the simulated tests shown in Videos 4 and 5, we plotted the corresponding pure pursuit path following error. The path following error for the same test with A\* and RRT\* is shown in Figure 8.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image8.png" width =80% class = "center" style="padding-bottom:0.1em;" />			Figure 8: The blue line shows the error for the A* algorithm, while the orange line shows the error for the RRT* algorithm. The peaks in error are where the simulated racecar is turning corners, which is where the racecar drifts away from the established path the most. For A* the average error while the path is being followed in simulation is 0.096 m. For RRT* this average error value is 0.103 m. </div>

The main goal of this simulation test was to allow us to quantitatively decide which algorithm, A\* or RRT\*, we should use on the real racecar. This meant we wanted a path that was generated as quickly as possible with a reasonable path length that our pure pursuit algorithm would be able to follow with relatively low error. 

We decided a successful algorithm would generate a path of a reasonable length in ten seconds or less and that this path should be able to be followed with an average distance error of 0.3 meters or less. We decided to use ten seconds as the path generation metric because of the time limit of the checkoff of this lab. In this case, generating a path with reasonable length means a path that utilizes long straight lines when possible and does not backtrack or excessively zig-zag at any point in the path. Furthermore, we decided to use 0.3 meters as the cutoff for the average error because of the size of the buffer we used on the Stata basement map. Table 1 shows the results of the simulation test for both A\* and RRT\* in terms of the three testing metrics. Both algorithms were successful in terms of path length and average error, but RRT\* was not successful in terms of the time it took to generate the path. This time could be brought down with further adjustment of the algorithm parameters, but we did not think this was necessary to pursue since A\* was successful in all categories.

<div style="width:image width px; font-size:90%; text-align:center;"> Table 1: The quantitative results of the simulation test in terms of our three defined testing metrics. Cells highlighted in green mean that algorithm performed better in that category, while red means the algorithm performed worse when compared to the other. It should be noted that the green and red highlighting do not represent the algorithm being successful based on our success measurements. A* was successful in all categories, while RRT* was not successful in the time category.<img src="/images/rss/lab6/image3.png" width =80% class = "center" style="padding-bottom:0.1em;" />			
</div>


### 3.2 Testing Procedure and Results: Real Racecar 

In evaluating A\*'s performance on the real racecar, we focused on two main experimental metrics. The first was the pure pursuit distance error, the distance between the car's localized position and the closest point on the generated path. Secondly, we relied on visually comparing the path the car followed in real life to the path that was generated by A\* in RViz. For example, we looked at how closely it cut corners in real life compared to the RViz path. It was necessary to make our own visual comparisons since the pure pursuit distance error is not a ground truth measure due to localization error. However, even though the pure pursuit distance error is not ground truth, it gave us a good estimate of how easy-to-follow our A\* generated paths are in real life. 

We tested using the pure pursuit error by following an A\* generated path for the Stata basement loop, the same as for the final race. We ended up increasing the robot speed for this test in particular to ensure we could complete the loop in a reasonable time limit. Because our pure pursuit algorithm has not yet been modified to adjust properly for a differing racecar speed, our racecar excessively oscillated around the desired path. This oscillation can be seen in both the RViz visualization video and the actual racecar video in 6 and Video 7, respectively (both of these videos have been sped up to two times speed for viewing purposes). 

Unfortunately, the RViz visualization froze at about halfway through the video in Video 6, so we cannot compare the RViz and the real world performance for the complete path. Despite these oscillations, the racecar was able to complete the full loop without any crashes, achieving our primary goal for path planning. We still need to modify our pure pursuit algorithm to eliminate oscillations even if the racecar speed is increased. This will allow us to complete the loop more quickly and effectively. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image4.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Video 6: The RViz visualization of the car completing the stata basement loop. The RViz freezes when the racecar reaches the bottom right corner of the map, but up until then it is easy to distinguish the oscillations of the car around the path even in simulation. This video is at two times speed.
</div>

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image1.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Video 7: A video of the racecar navigating the full stata basement loop based on the A* generated path. The car oscillates around the path, but the car does not run into any obstacles while driving the loop. This video is at two times speed.
</div>

We gained insight into the car's performance and what needs to be improved from our visual comparison of the path and the racecar's movements. For a more quantitative metric to evaluate our car's performance, we collected the pure pursuit distance error based on the localization estimate of the racecar's position. This error is plotted in Figure 9. The average error for the loop was 0.87 meters, which is much larger than our desired criteria of success (0.3 meters or less). So while we were able to drive the path without any collisions, it is likely an inconsistent result that we cannot rely on due to high error. In order to have a successful real life performance for the entire loop, we need to modify our pure pursuit algorithm as mentioned earlier.

<div style="width:image width px; font-size:90%; text-align:center;">
	<img src="/images/rss/lab6/image14.png" width =80% class = "center" style="padding-bottom:0.1em;" />
	Figure 9: The error for the whole duration of the Stata basement loop. There is a large amount of oscillation around the path, especially before 500 samples. The peaks in error are due to the racecar turning corners, which is where the racecar drifts the furthest away from the established path. While traversing the loop, the racecar's average error was 0.87 meters.
</div> 

Since we used a faster speed then we had planned for our stata basement loop test, we used a slower, more reliable speed for testing only a portion of the Stata basement loop. For this shorter test, we did not collect the pure pursuit distance error data, but from visual examination, there were no significant oscillations. The RViz visualization in Video 8 shows that the racecar followed the path with very high precision, and there was little divergence from the path even when turning a corner. Comparing Videos 8 and 9 show us that there are no oscillations and the path is being followed as expected from the simulation. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image13.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Video 8: A video showing the RViz visualization of the racecar following a path for a portion of the Stata basement. The localization representation of the racecar in RViz follows the path precisely and only diverges slightly when turning corners.
</div> 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/lab6/image12.gif" width =80% class = "center" style="padding-bottom:0.1em;" />			Video 9: The video of the racecar following a corresponding path to the path in the Video 8 simulation. The video confirms the precise following of the generated path as well as the absence of oscillations around the path.
</div>

As mentioned earlier, the overarching success metric of our racecar's performance is the ability to follow a path without crashing into obstacles. In both testing scenarios, we were able to do this, but we were not able to meet our pure pursuit distance error success metric when driving the full Stata basement loop. We will work on our pursuit algorithm so that it meets this metric for the final race.  


## 4 Lessons Learned

The lessons learned from this lab extend well beyond search algorithms and ROS structures. As a team, we refined how we approached the lab, divided work, and integrated individual parts into a cohesive unit. One thing we specifically tried to emulate was our approach to lab 3, designing a safety controller. In that lab, we set aside time as a group to brainstorm ideas and approaches together before jumping into individual work. This structure kept everyone aware of the different parts of the project and allowed for more idea generation. This was useful in lab 6 when deciding between search algorithms and picking the cost function.

One new challenge we faced occured when migrating code from simulation to the racecar. In the past, this has been difficult but the one or two people assigned this task had always been able to make steady progress. In this lab, however, things worked out differently. We started with a mostly-working system with just one unknown bug. While debugging that problem, we regressed several times and eventually found ourselves unable to run any of the code on the racecar that had worked just hours before. To fix this in time for the final checkoff, we had to come together as a team, each trying different ways to fix the numerous problems. This led to a very tense, communication-intensive environment that we had not experienced yet. From this we learned how to approach the problem and work cooperatively on difficult bugs. 


## 5 Future Work

Our work on the path planning lab enabled our car to navigate autonomously through the entire Stata basement after being given only a few waypoints.  However, the class challenge is a test of time, meaning the robot's path planning, trajectory following, and localization have to be as efficient and optimal as possible. Moreover, our goal is to complete the course in record time.

The robot in its current state has inefficiencies in three criteria of path planning, trajectory following, and localization. Our initial ideas for optimizing path planning were based around a large graph representation for our search-based path planner - in fact too big for our computers to handle. Instead, incorporating orientation and velocity variables into our sample-based path planner will allow us to compute the most time-efficient path through the entire basement. Likewise, our pure-pursuit planner will be tweaked to find a better balance between error from the goal path and speed.

Lastly, the localization algorithms will be adjusted to better handle new objects in the hallways and higher vehicle speeds.  A new map of the Stata basement may be constructed using Google Cartographer to provide the most up-to-date version of the environment to our vehicle.  Additionally, the motion model and sensor model described in the Lab 5 report will be fine-tuned to propagate and select a high-quality position estimate.  Overall, efficient and fast algorithms are what stand between our car right now, and the car that will win the class racecar challenge. 

