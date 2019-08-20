##  Automated Mail Recognition and Notification

<div class="alert alert-primary" role="alert">
  Credit for 99% of this write-up of the project goes to <a href="http://www.miloknowles.com">Milo Knowles</a>.
  The code for this project can be found at: <a href="https://github.com/miloknowles/male-sorter.git">https://github.com/miloknowles/male-sorter.git</a>
</div>

For **MAKEMIT 2019**, my team of Brandon Motes, Milo Knowles, and myself built an automated mail system.

I was responsible for the motor controls and serial interface with the Python scripts, along with the name matching implementation. I also help Brandon fabricate the mechanical system, along he was in charge of designing it.

Some problems we noticed with physical mail today:
- **Mail sorting is a manual process at its final destination.** A lot of apartment buildings require the mailman or a worker to sort mail into mailboxes for the residents. In my fraternity for example, we have a brother tasked with the job. This leads to mail getting misplaced occassionally and adds an additional delay to people getting their mail, as the sorting happens sometime after it gets delivered.
- **We don't have a notification system for mail**, requiring people to check their mailboxes periodically. It would be useful to know exactly when your mail arrives, and get a preview of what it's about.
- **Most mail nowadays is spam**. Processing it digitally allows us to apply email spam filtering techniques to physical mail.

<hr class="mb-5">

### Mechanical Design

To make the text detection more robust, we need to check both sides of each envelope. The envelope is held at a 45-degree angle, and can be flipped to either side by a servo. This allows a single camera to image either side. We can account for this 45 degree rotation later on in software.

<figure class="figure">
  <img class="figure-img rounded mt-1" width="100%" src="/images/mail-sorter/mechanical.jpg">
  <figcaption class="figure-caption"></figcaption>
</figure>

### Optical Character Recognition

We used Google Tesseract to detect characters in camera images. This was probably the most complex and unreliable part of our processing pipeline. 

Overall, the OCR algorithm (LSTM based neural network) performance varies a lot based on the image resolution, orientation, and lighting. We did a lot of preprocessing:

- Convert image to grayscale
- Denoise using a bilaterial filter (while preserving edges)
- Detect the corners of an envelope and apply a perspective transform to view the image top-down

<figure class="figure">
  <img class="figure-img rounded mt-1" width="100%" src="/images/mail-sorter/edges.png">
  <figcaption class="figure-caption"></figcaption>
</figure>

<figure class="figure">
  <img class="figure-img rounded mt-1" width="100%" src="/images/mail-sorter/crop.png">
  <figcaption class="figure-caption"></figcaption>
</figure>

<figure class="figure">
  <img class="figure-img rounded mt-1" width="100%" src="/images/mail-sorter/birdseye.png">
  <figcaption class="figure-caption"></figcaption>
</figure>

We found that OCR gives much better results on high resolution crops of the relevant areas of text. We were low on time, so the quick and dirty thing to do was to just crop our image into the most likely locations to contain text. A more sophisticated strategy for detecting blocks of text would undoubtedly give better results.

We crop the envelope into 4 quadrants, as well as the center, since these are common locations for name information.

Even after all of these enhancements, OCR performance is still a little messy. For instance,
```
========= DETECTED TEXT =========

<< TOP LEFT >>
["CHASE o
, 6 PO 30x17198 I Wilmington. DE l9850-7198
CHASE ‘ -I

901-232700‘5405'55501-02'21 1
DELIAN ASPAROUHOV
NIGHTINGALE APP INC
487 COMMONWEALTH I
BOSTON. MA 02215—2201", "PRSPT STD

<< TOP RIGHT >>
U.S POS'AAGE
9ND
W0 CENTER

<< BOTTOM LEFT >>
\\VE.", '\'\'\'\'\'\'\' lu\'l"u\'lIl\'II"Ic\'III\'l|I-u‘
EARN 80,000 B\n\nwith the Chase Ink Busi

<< BOTTOM RIGHT >>
Se»; dddddddd', 'ONUS POINTS
niness PreferredSM Card', '901\'232706‘5405‘55501-02‘21 1

<< CENTER>
DELIAN ASPAROUHOV
NIGHTINGALE APP INC
487 COMMONWEALTH AVE.
BOSTON. MA 02215—2204
"\'1\'I"Iu\'l"II\'I-I\'II"II\'III\'III\'II"|I""II\'u"II“I\'I\'III
I on nnn Rnkll IC D“']
```

We do get a few potentially useful pieces of information, such as name, address, and sender address. Tesseract seems to think the barcode thing under the address is a bunch of 'I' characters.

<hr class="mb-5">

### Text Matching (Edit Distance)

**Oftentimes, we detected something close to the correct name, but not an exact match. In addition, we got a lot of irrelevant text.**

We use **Levenshtein distance** as our similarity metric. Essential, it is the number of characters that you would need to edit to transform one string into another.

For each pair of first and last names in our database, we compute a Levenshtein distance between that name and each detected word on the envelope. **We add together the smallest distances for the first and last names and normalize by the total number of characters.** You can think of this as the percentage of a person's name that we had to modify to match it to two words on the envelope.

In our detected text above, we did in fact find ```Delian Asparouhov```, giving us a distance of zero and a perfect match.


```
========== DATABASE MATCHING ==========
Name: Delian Asparouhov Score: 0.0
Match found! Sending milokhl@gmail.com an email.
```

In a different example, the OCR system misreads a name and address:

```
5672
Mork Halsey
487 Commonweollh Ave
```

The true name is ```Mark Halsey```, but the detection is close. (Some other text was included for more context). This is only a single letter edit away from the correct name, so the matching algorithm returns:
```
Name: Mark Halsey Score: 0.09090909090909091
```

Milo found a small bug when writing this up - we divide by ``11`` characters instead of ```10``` by including the space between the last and firstnames. This still captures the rough idea: we have an edit distance of ```1``` character, and divide by the total of ```11``` characters.

A more sophisticated probabilistic approach could take into account the confusion matrix of the text recognition algorithm. Levenshtein distance assumes that each character is the same "distance" from each other, even though certain letters are more likely to be confused for one another. For example, if Tesseract seems to confuse an "i" for an "l" more often than it confuses a "k" for an "l", we want to model this. The edit distance between an "i" and an "l" should be smaller than a "k" and "l".

To make this concrete, let's say we have two people in our database, ```Milo``` and ```Miko```. We detect the name ```Miio``` on our envelope. Using vanilla Levenshtein distance, both ```Milo``` and ```Miko``` have an edit distance of ```1```, producing a tie. However, given that Tesseract often confuses ```i``` and ```l```, we know that ```Milo``` is the more probable match.

<hr class="mb-5">

### Email notification

We use ```smtplib``` in Python to send emails to the detected recipients.

<figure class="figure">
  <img class="figure-img rounded mt-1" width="100%" src="/images/mail-sorter/inbox.png">
  <figcaption class="figure-caption"></figcaption>
</figure>