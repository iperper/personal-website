# Final Challenge

### Final Video

<a href="https://youtu.be/tiVfADZFjLc">Final Video</a>

### Final Briefing

[Final Challenge Briefing](https://docs.google.com/presentation/d/1dHr2mTyrLZaleXbNWaVoFdjahFW9u8MHwrJ62HRY_TI/edit?usp=sharing)

## Final Challenge: Navigating Using Deep Neural Nets: Gate Detection and Imitation Learning

###	1 Overview and Motivations
Each lab we have completed in Robotics: Science and Systems (RSS) has lifted our robot's autonomous capabilities up the ladder of abstraction: the safety controller dealt with low-level control and actuation, the parking controller lab worked with state estimation, and the localization and path planning labs involved spatial perception and motion planning.

Our final challenge consisted of two modules: Gate Localization and Imitation Learning. In the first module of our final challenge, we worked with the high-level perception capabilities of our robot, using machine learning to perform camera-based gate classification and masking. In the second module, we deployed an imitation learning system, PilotNet, which spanned low and high-level perception and control to drive a car around the entire Stata basement loop based solely on human-driven examples.

Deep learning for autonomous driving is a cutting-edge research field that many companies are investing in. Deep learning allows computers to learn from rich visual information about the environment in scenarios where explicitly model-based approaches are weak. Working on this final challenge gave us the opportunity to experiment with these novel approaches and understand how they work. 

###	2 Proposed Approach
For each of the modules of our final challenge, we implemented a different machine learning approach appropriate for the task. 

To perform gate detection, we needed to look at an image and determine if there was a gate, and if so, how to drive to it. This task is well suited for Convolutional Neural Networks (CNNs), which excel at object detection in images. A CNN works by performing a series of convolutions and pooling operations on an image to identify edges, shapes, and other features. By training a CNN on a labeled dataset (pictures labeled as having or not having a gate), we created a system which achieved multiple levels of abstract feature detection and identified the existence and location of a gate in a picture with high accuracy. From that information, we then calculated the necessary steering angle to drive through the gate.

For driving around the Stata basement, we used a different machine learning algorithm known as imitation learning. Imitation learning is a learn-by-watching strategy. One of the advantages of this approach is that it is simple to tailor a dataset to a specific application. The algorithm is given a dataset containing human responses to different situations. For instance, when given an image of a road curving to the right, a human will likely turn the steering wheel a certain amount clockwise. After training, the machine learning model will know to also turn to the right when given a similar image. To learn how to drive around the Stata basement autonomously, we first recorded several human attempts at navigating around the loop. Then, we used this data to train a model to respond in the same way. 

### 2.1	Technical Approach 

#### 2.1.1	Gate Localization and Following

Image classification is a method that determines which of several classes an entire image frame is most likely depicting. Supervised learning with CNNs is an elegant and powerful method to produce accurate image classifiers in a variety of domains. In the supervised training of a classifier, training images are manually assigned one-hot labels indicating the class they belong to, and a CNN is trained to correctly predict the labeled class from all the pixels of an image.

Image segmentation, on the other hand, determines which pixels of an image belong to the same object as one another.  Compared to classification, there is less consensus around the best technique to perform image segmentation. Fully supervised image segmentation using neural networks is a challenge, because labeling which pixels belong to an object in an image is a prohibitively time-consuming task for a human engineer to perform. Oquab et al. (2015) proposed a method for obtaining image segmentation ability ‘for free' from a well-trained CNN classifier, using a method known as weakly-supervised learning. Their insight was that the hidden layers of a CNN, which detect features in an image through convolutional and pooling operations, can function as an effective segmentation “heat map” in an image classifier, exhibiting high activation in the regions of the image where the object being classified is present. 

We used a CNN-based perception module to localize gates using our racecar's cameras. First, we implemented a CNN image classifier to detect whether an image in our environment, the Stata basement, contained a gate or not. We trained our CNN using hand-labeled images taken by our racecar's camera in our test environment. Our “no-gate” data was generated by driving in the basement with no gate in sight, and our “gate” data was collected by driving with the gate visible to the car's camera. We collected 5500 “gate” photos for training and 530 for testing, and 5900 “no-gate” photos for training and 1200 for testing. Our CNN followed the LeNet-5 architecture (LeCun et al., 1998) with alternating layers of convolution and subsampling, as shown in Figure 1. We downscaled our images to a resolution of 240x320 pixels for input to our network. 
Our final network architecture (Figure 1) was as follows:
Layer 1: Convolution, 7x7 kernel, 6 filters
Layer 2: Avg-Pool, 5x5 kernel
Layer 3: Convolution: 9x9 kernel, 16 filters
Layer 4: Avg-Pool, 3x3 kernel, 16 filters
Layer 5: Flatten to 1x3456
Layer 7: Fully connected 1x60 layer
Layer 8: Fully connected 1x2 layer (output, steering angle and velocity)

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/lenet.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 1. Our CNN Architecture for Image Classification</div>

Following the method of Oquab et al., we extracted a heat map from the final hidden layer of our architecture. Our network architecture was selected in part by tuning the parameters of our convolutional and pooling operations until the heat map we extracted was of appropriate resolution. The heat map generated from the architecture we selected was observed to align well with the true location of the gate (Figure 2).

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/heatmap_combined.png" width =80% class = "center" style="padding-bottom:0.1em;" />   Figure 2: Left: An image of a gate captured by our racecar's camera. Right: The heatmap generated by the activations of our CNN's final hidden layer. Activations are elevated (yellow regions) in the location of the gate. </div>

#### 2.1.2  Gate Navigation

With the heatmap generated by our CNN, our algorithm estimates the location of the gate relative to the racecar. We identified the point on the heatmap with the highest value and identified all points within a certain frame around the max point which achieved a value greater than 20% of the highest value. Also, we only look at pixels that are within 10% of the image height vertically from the y-position of max valued pixel. Essentially, we only analyze 20% of the image in order to reduce false positives - high heatmap values that correspond to non-gate features throughout the image. The pixel locations meeting both the 20% vertical zone requirement and the minimum 20% of the max value threshold were then used in a weighted average calculation to determine a “central” gate position the car should steer towards.

Our initial weighted average approach took three weighted averages: one for the left, center, and right image, assuming all three images were given a label of “gate”. These three weighted average locations were then averaged together to get a single pixel location. By performing three weighted averages followed by an unweighted average, we ended up with inaccurate central gate locations. The final location was both skewed by artifacts in the images that were not actually gates, but had high enough heatmap values to meet the 20% threshold, and by the fact that the cameras are mounted in an arc on the racecar. An example of this skewed data can be seen in Figure 4, which includes original and heatmap images.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image7.png" width =80% class = "center" style="padding-bottom:0.1em;" />   Figure 3: (Top) Images from the left, center, and right cameras on the car. (Bottom) Corresponding heat map. The left image contains numerous false positives. The two non-circled red dots correspond to the center of the “gates” in the corresponding camera frames, even though there is no gate in the right image. The circled red dot in the middle is the average between the two red dots on the left and right, and it shows that the car will steer straight forward even though the gate is actually to the racecar's left.</div>

After observing the lack of robustness in our approach, we decided on a new algorithm. We used the measured angles between the cameras, 45 degrees, along with the camera range, 60 degrees (Figure 4). We generated three angle ranges for the three different images to better understand the location of every pixel in the image. With respect to the car reference frame, the left camera covered 15 to 75 degrees, the center camera covered 30 to -30 degrees, and the right camera covered -15 to -75 degrees. We mapped the pixel in each image to a specific angle by dividing each individual angle range by the width of the image. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image5.png" width =80% class = "center" style="padding-bottom:0.1em;" />   Figure 4: The angle between each adjacent camera is 45 degrees when measured from the centers of the camera. The camera range for each camera is 60 degrees. </div>

 We then calculated the steering angle to be the single weighted average of angles, instead of pixel locations, using only the same pixels that met the 20% threshold and restricted vertical frame as described in section 2.1.2. The weights were defined as the exponential of the pixel's heatmap value, while the average over the corresponding angle values (in radians). We used an exponential function to intensify weight the high-pixel values of the heatmap. This generated steering angle was inputted as a steering command to allow the racecar to navigate through the gate. A successful gate navigation can be seen in Video 1.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/image2-small.webm" type="video/webm">
		<source src="/images/rss/final/image2-small.mp4" type="video/mp4">
	</video>
	Video 1: The car uses the heatmap generated from the camera view and a calculated steering angle to drive towards and through the gate. </div>

Using deep learning for gate detection and navigation is a relatively novel approach, and we found it to have both strengths and weaknesses. Our CNN was accurate in determining whether or not there was a gate in the camera frame, which would have been much harder if we had used lidar scans to attempt to classify objects. On the other hand, it was difficult to generate a steering angle from the heatmaps that would work in multiple circumstances; we were not able to drive through more than one consecutive gate, and only certain starting positions enabled us to drive through the gate successfully.

### 2.1.3	Imitation Learning

Camera-based visual navigation is an appealing strategy for the control of autonomous vehicles. Cameras are currently less expensive than LIDAR sensors and can generally sense a more complete representation of the world. However, the control, localization, and mapping techniques we have implemented in past Robotics: Science and Systems labs for LIDAR-based navigation are not easily applied to camera-based navigation.

To address this, we turned to machine learning - specifically, we performed imitation learning with a CNN-based model called PilotNet. PilotNet learns from a dataset of images taken from example driving sessions. Each image is labeled with the steering command commanded by a human driver at the moment it was captured, and PilotNet learns to predict these labels in a generalized manner from camera images (Figure 5). We implemented PilotNet using the tensorflow machine learning library and applied it in two environments: the Udacity Self-Driving Car Simulator and the real-life Stata basement.  After extensive data collection and tens of thousands of training iterations, we trained our implementation of PilotNet to map camera images to steering angles well enough to imitate human driving behavior, successfully navigating large segments of the Stata basement loop without human intervention.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image9.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />   Figure 5: CNN architecture for PilotNet model that we used for imitation learning. </div>

#### 2.1.3.1 Simulation Environment

To become familiar with how PilotNet reacts to changes in training data and other training parameters, we began our experiments in a simulated driving environment in the Udacity Self-Driving Car Simulator. We began by collecting four full laps of driving, during which the commanded steering angle is recorded along with left, right and center images from the perspective of the vehicle in the simulator.  Video 2 illustrates the simulated vehicle being driven manually on the track.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/sim_training_sped-trimmed.webm" type="video/webm">
		<source src="/images/rss/final/sim_training_sped-trimmed.mp4" type="video/mp4">
	</video>
	Video 2: The car being manually driven around the track.  The goal of these training runs was to gather steering angle and camera view pairs that the model could learn to “imitate” when confronted with similar camera views. </div>

Once data was collected, we began the training process. An important part of training is data augmentation. If a model were to be trained solely on the exact data we collected, the result would not be robust enough to small changes in conditions, such as the sun shining at a different angle or being on a different side of the track.  Thus, we introduced randomly selected augmentations that essentially create formulated noise in the data.  For the simulation data, this included increasing the brightness of the image, changing the gamma values, adding random shadows, and translating the image in various directions as seen in Figure 6. When our model subsequently encountered these conditions during deployment, it was better able to respond appropriately thanks to this augmentation.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image4a.png" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 6: Four different augmentations were applied to the training data to introduce noise.  This improves the robustness to new data, as the model is presented with a larger variety of environments and training sequences. </div>

 The translation augmentation was an especially important transformation for this autonomous driving task because it enabled the model to learn what to do at a variety of locations on the track; the original data was taken from the car's location being close to the center the whole time, which is not always true during deployment. Our augmented dataset was used to train on the PilotNet model. We first tried training on 20 epochs of 300 images each, which led to a test accuracy of 78.7%. This model performed well on straightaways in the simulator, but failed on the first corner. After several iterations of data collection and training, the model eventually was able to complete half a lap as shown in Video 3.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/sim_auto_sped-faster.webm" type="video/webm">
		<source src="/images/rss/final/sim_auto_sped-faster.mp4" type="video/mp4">
	</video>
	Video 3: An autonomous run of the track.  The model was able to traverse half the path, including a sharp turn and the bridge, before leaving the track. More data at the failed turn is needed to continue further along the track. </div>

#### 2.1.3.2 Race Car: Table Path

Our next challenge following simulation was to train the car in real life. Before attempting to take on the basement loop, we traversed a simple path circling a table. This simple path was an appropriate stepping stone to the basement loop because it had an almost constant steering angle for the car to base its training on and no repeating features in different locations, allowing for a straightforward implementation of our trained model. Again, the training data we collected for our real-life driving tasks included the commanded steering angle of the racecar and the corresponding “long” image generated by the three cameras. 

For the data to be useful to train a model for a moving vehicle, all of images in which the car was stationary (the speed was roughly 0 m/s) were removed from the training set. Following this filter, the images were randomly augmented to create a more robust training set for the model. The augmentations implemented in our model included random translations, horizontal flips, varying brightness, and changing the hue of the inputted images from the data set randomly similar to those in Figure 6 above.

After creating and training a model using the PilotNet architecture, running for 5 epochs at  800 steps per epoch,  we validated the model on a test set and then implemented it on the on the table (Video 4).

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/circle_working-faster.webm" type="video/webm">
		<source src="/images/rss/final/circle_working-faster.mp4" type="video/mp4">
	</video>
	Video 4: The car successfully drives around a classroom table using imitation learning. </div>

#### 2.1.3.3 Race Car: Stata Basement Loop

After a successful implementation of the model trained to circle a table, we began collecting data for the entire stata basement loop. Initially, our collected dataset was simply the result of three continuous laps manually driven around the loop. The training data and training methods for the loop was of the same format as described in section 2.1.3.2.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/image11-trimmed.webm" type="video/webm">
		<source src="/images/rss/final/image11-trimmed.mp4" type="video/mp4">
	</video>
	Video 5: Although the implemented model followed straight paths as desired, it was unable to make turns properly.
</div>

An apparent flaw in the trained model was that the model was able to follow straight paths in the long hallways very well, but failed to make even a single turn properly, as seen in Video 5. This was because our training data overwhelmingly consisted of examples in which the car drove straight, and our model was able to achieve low error without learning to take turns at all. To solve this issue, we collected more data for the turns and filtered out some of the straight path data to provide the car with a more uniform distribution of turning angles. This improved our models ability to make turns at all, but it was still unable to make the turns consistently.

In addition, we trained a model with just the data collected from the front camera to see if the steering angle offsets based on the relative angles of the side cameras to the center camera were the problem. Although doing so improved the model slightly, the improvement was not significant enough to be the root of our model's inability to make turns, so we returned to using all three cameras for training. 

We finally achieved reliable turning behavior by implementing a variety of algorithmic improvements, like those shown in Figure 7. The first of these improvements was to shuffle the validation data, allowing the model to validate itself based on a random assortment of the training data, rather than simply the last batch of data collected, allowing for a better distribution of validation steering angles and resulting in better quantification of our training progress. Furthermore, we switched to a Mean Absolute Error rather than a Mean Squared Error as as our loss function which made out model more robust to outliers in our data. We also collected a larger quantity of data, including a lot more turn data, and supplemented it to our previously collected data set to increase the set of data to train the model on.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image1.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 7: Through a variety of solutions, including image augmentation, targeted data collection, and targeted data sampling, our training model was provided with a more uniformly distributed set of steering angles, enabling it to learn diverse turning behaviors. </div>

Lastly, to reduce the test loss and training loss of our model, we trained for more iterations than we had previously attempted. This was to provide the model with ample ability to converge to a global minimum for its loss. 

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image14.jpg" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 8: Loss when training for 30 epochs at 2000 steps per epoch; stability is nearly reached at 20 epochs.</div>

 After training the model for more than 30 epochs at 2000 steps per epoch, as seen in Figure 8, we found that the model's validation loss began to level out at approximately 20 epochs, and so we deployed the model obtained with 20 epochs of training.

### 2.2	ROS implementation

The majority of the work for the final challenge was done in Tensorflow, but interaction with the low-level control software of the racecar was also necessary to actuate the neural network's commands.  Tensorflow and the rest of the image processing stack ran in Python 3, while ROS runs in Python 2, so a workaround to communicate between the two languages was required.

The ZMQ library is a Python 2 and 3 library that allows for simple networking. Essentially, a local Python 3 server was created to capture image data and infer the correct steering angle from the model.  A Python 2 client would listen to this server and frequently request the steering angle.  In this manner, a ROS Node was able to command a steering angle and drive speed while the neural network was working in parallel, which is noted in Figure 9.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image3a.png" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 9: The Python 3 server runs the neural network inference model and sends the required steering angle to the ROS nodes via a local network.  ROS controls the steering and speed, which in turn updates the location and camera feed of the car, and the cycle continues. </div>

 Although the Python 3 server was chosen to capture image data from the cameras, ROS could have also been used to capture image data into ROS topics and transport it between various nodes. However, since no other nodes required the image data, it made the most sense to have the Python 3 server handle all the image capture itself.

## 3 Experimental Evaluation

Due to the nature of machine learning, it is difficult to quantitatively evaluate our performance when testing our generated models. Unlike path following with LIDAR-based localization, there is no ground truth value to compare an action to. Instead we have to rely on an understanding of what actions seem justifiable and make situational sense based on the given application. With this in mind, we evaluated our models' respective performances in three ways. 

First, we evaluated our model performance based on the model's accuracy on the data training set. A model's training set performance was deemed adequate when the accuracy was within 90% to 95%. Although training accuracy is not always a great indicator of real-world performance, an accuracy above 95% for the models we used generally would have indicated overfitting, so we didn't want to surpass that.

Secondly, after performing well on the training set, we evaluated our model on a test set. A model was expected to achieve an accuracy between 75% and 85% on a validation set in order to be considered a successful model that could be applied to the desired environment.  

The third and final method of evaluation occurred when testing the model in the proper environment: the environment being either simulation or the real world based on the desired model application. The evaluation method used is essentially based on the model's ability to complete the task at hand: navigation through gates and traversing an imitated path without crashing or going off course. While this evaluation is not numerically supported, it is the most important form of evaluation since the end goal is to successfully complete the desired task. This evaluation method often differed from the expected results based on test accuracy, showing that there was still a lot to be understood about how the model learns features.

### 3.1 Gate Detection Navigation

Our best performing gate detection model has a training accuracy of 93%, which is within the successful range of 90% to 95%. Unlike some of our other models that overfit the training data and performed poorly on the test set and in real life, this model had a reasonable accuracy on the test set as well. The model test set accuracy was 81%, which is within our desired range of 75% to 85%. Since our model met our first two success requirements, we moved onto the real world implementation.

We achieved varying results when evaluating the real world application of gate detection/navigation on the racecar. The racecar was usually able to find its way towards the gate, but often crashed into the leg of the gate instead of navigating through it: both scenarios are seen in Videos 6 and 7. 

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/image2-small.webm" type="video/webm">
		<source src="/images/rss/final/image2-small.mp4" type="video/mp4">
	</video>
</div>
<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/gate_not_working_1.webm" type="video/webm">
		<source src="/images/rss/final/gate_not_working_1.mp4" type="video/mp4">
	</video>
	Videos 6 and 7: A successful and unsuccessful attempt to drive through the gate autonomously using the same model.
</div>

Less than half the time, the racecar was not able to navigate towards the gate at all. This occured when our heatmap picked up on parts of the environment that were not the gate. Ultimately, our model relies on deciding if the image has a gate in it by detecting the columns of the gate (Figure 10). As soon as a person or other column-like object was detected in the camera view, the model (often incorrectly) indicated that the column object was a gate. This improper identification resulted in an inaccurate steering angle away from the actual gate.

<div style="width:image width px; font-size:90%; text-align:center;"><img src="/images/rss/final/image12.png" width =80% class = "center" style="padding-bottom:0.1em;" />    Figure 10: The model identifies columns as gate features, even if the columns are not actually part of the gate. Here, the model correctly detects the gate supports as the gate itself, but other columns or people in the hallway often confused the model. </div>

Despite the pitfalls of the model and its sporadic ability to navigate through gates, the model performed as expected and can be deemed a success. Since we are using weakly-supervised learning with a binary classifier, we cannot expect 100% accurate navigation; we can expect the model to do a good job at classifying an image as having a gate or not having a gate, but we cannot expect the model to fully understand all the features that make up a gate. We are using an early and outdated machine learning approach, so we did not expect as high level performance as can be achieved by some newer deep learning models. Additionally, our model is only using two convolutional layers, which limits our performance. The fact that our model had high accuracy in classifying the existence of gates and was able to allow us to navigate through gates a portion of the time is a great success considering the limitations of the model implementation. 

### 3.2	Imitation Learning: Simulation

The performance of the simulation was evaluated based on the ability to stay on the simulation track and complete a lap.  Although the car never completed a full lap, the performance improved as we iterated on the training parameters. Surprisingly, the simulations models all stayed around 80% test accuracy, even though the autonomous simulation results improved qualitatively (the car travelled farther). This could be the result of a variety of factors, but primarily the model may not have learned the correct features each time, such that it coincidentally was doing the right thing until it failed.

When we began increasing the number of images in an epoch from 300 to 1000, we saw drastic improvements in the simulation results even though the test accuracy was still at 78.6% in our most successful model (compared to 78.7% for our first model). At the same time, we were also including more corners in our data so that the ratio of corners to straightaways would be higher.  Although the test accuracy did not improve dramatically, the performance of the model in simulation suggest these changes produced a better training environment such that model learned features that more directly correlated to simulation track performance. Further improvements could be made by quantitatively analyzing the distribution of data and steering angle in comparison with simulation results, such at the analysis done in Section 2.1.3.3 for the full basement loop.

### 3.3 Imitation Learning: Real World

The initial model performance was evaluated based on both the comparison between the validation set steering angles and the training model steering angles. This, however, was not the final method of evaluation, as the true test of the model's performance is its ability to traverse the path it is trained to in real life.

In the first simplified training environment, which involved circling a single table, our model was able to successfully traverse the circular path because of its simplicity, but more refinement to our training algorithm was needed in order to train a model on the stata basement loop.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/circle_working-faster.webm" type="video/webm">
		<source src="/images/rss/final/circle_working-faster.mp4" type="video/mp4">
	</video>
	Video 8: Implementation of a trained model autonomously traversing a circular path around a table in a Stata basement classroom. 
</div>

For the second model, which navigated the entire stata basement loop, the improvements to the training algorithm mentioned in Section 2.1.3.3 resulted in a very robust training model that was able to adequately traverse the Stata basement loop.

<div style="width:image width px; font-size:90%; text-align:center;">
	<video class="center" width=80% autoplay loop>
		<source src="/images/rss/final/stata_loop_working.webm" type="video/webm">
		<source src="/images/rss/final/stata_loop_working.mp4" type="video/mp4">
	</video>
	Video 9: The final trained model was able to successfully navigate the entire stata basement loop relying solely on the input images from the car's three webcams. 
</div>

## 4 Learned

The final challenge taught us many important lessons that we are sure to use in our future work in robotics. Because this challenge was so dissimilar to past labs (because it focused on machine learning), the learning curve was steep and it took us some time to get situated with the implementation and testing environments. 

First of all, machine learning, especially with pre-made NN architectures, can often be blackbox that is hard to debug. The exact mechanisms for learning features and actions are not entirely understood. There were times that we got stuck and had to turn to each other to brainstorm solutions to fix the issue. Additionally, collecting training data often takes time, and this process has to be repeated as we learned more about what type of data the model needs. This is especially true for the PilotNet model, because imitation learning is only as good as the data collected, so having a method of collecting consistent and useful data was critical in achieving success. 

Furthermore, we began to understand the limitations of hardware when we tried training on computers without GPUs; it's important to consider the operating machine when implementing algorithms that involve a lot of data processing. Finally, we learned better time-management techniques when it came to splitting up work, because we had three separate, time-consuming tasks (gate detection, imitation learning, and final race). At first we have everyone try to work on the challenges, but eventually moved two people to work fully on the race. 

## 5 Future Work

Looking forward, we would like to delve into reinforcement learning which is a trendy topic in autonomous robotics right now. Throughout the final challenge, we were implementing supervised learning, that is, learning based on the guidance of the inputs, which have been labeled to serve as “ground truth” of what is correct.  For small datasets, this generally works well, but as models get more complex and more data is needed, gathering and labeling large sets of data efficiently and accurately is a logistical challenge. Instead, reinforcement learning can be used to learn faster and more accurately.

For the scope of this class, we attempted to train the car to drive around the loop simulator similar to what we did with the imitation learning. However, instead of training on our own laps, we would start the car with no prior information, and give it a “reward” for staying in the middle of the track. If it ever leaves the track, we would restart the training, while keeping the information the car had already learned.  Thus, over time it would learn that the best possible “reward” could be achieved by steering to the middle of the track from the entire loop. One of the biggest benefits of this approach is that it can be done quickly, as driving can be done at an accelerated speed, rather than making a human drive around the track each time more data is needed.

Although an area of active research, we could further this work by attempting to transfer the reinforcement learned model from the simulator to the vehicle. However, a much more accurate simulator for vehicle dimensions and environment would have to be used, and many refinements would have to be made to the model once it was on the vehicle.

