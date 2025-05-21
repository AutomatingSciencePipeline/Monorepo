# About

GLADOS, the Automated Science Pipeline, started when Dr. Jason Yoder, a CSSE Professor at Rose-Hulman Institute of Technology, found himself building the same interface for many different computational research projects over his years of research. Finding a natural need to make this repeated process easier to set up, the project began in 2021 as a senior capstone project, with continuous iterations done by different senior capstone project teams each academic year. The goal is to provide a useful website for people with hard to run experiments that they need to iterate on, as GLADOS will speed up the time running those experiments take while also providing a nice interface to view the experiment results on.

 The 2024-25 team completed the Kubernetes system migration and created the scalable VMs server infrastructure. They migrated the database from Firebase to MongoDB and authentication from Firebase authentication to Auth.js. They also improved the system's usability by adding features like default experiments, charting, cancellation, archiving, deletion, collapsing, and expanding experiments.


Below is the most recent poster shown at the Rose Show for the 24-25 year.

![poster](https://raw.githubusercontent.com/AutomatingSciencePipeline/Monorepo/refs/heads/main/docs/images/about-Rose_Show_Poster-05_2025.png)

## FAQ

* Why 'GLADOS'?

GLADOS stands for 'General Learning and Automatic Discovery for Operationalizing Science', which is a mouthful, but has a memorable acronym, taking inspiration from the Portal series.

* What technology does this project run on?

GLADOS uses React and Next.js on the frontend, Python on the backend, and MongoDB for data storage, with Auth.js for account management. The production server currently runs on a Kubernetes cluster within the Rose-Hulman firewall, utilizing multiple machines and VMS also provided by Rose-Hulman, giving Kubernetes enough processing power to properly allocate multiple experiments being run at once.

* Future goals?

GLADOS aims to become more secure in order to eventually broader its scope to be more open source. In addition, getting GLADOS to be at least semi-functional from a mobile device would allow for more flexibility in its usage. These goals are being handed off to next year's senior capstone project team.
