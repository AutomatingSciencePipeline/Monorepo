# About

GLADOS, the Automated Science Pipeline, started when Dr. Jason Yoder, a CSSE Professor at Rose-Hulman Institute of Technology, found himself building the same interface for many different computational research projects over his years of research. Finding a natural need to make this repeated process easier to set up, the project began in 2021 as a senior capstone project, with continuous iterations done by different senior capstone project teams each academic year.

As of 2024, the project has reached basic usability, allowing for multiple experiments to be ran on the system in parallel, without requiring large changes to the original code.

## FAQ

* Why 'GLADOS'?

GLADOS stands for 'General Learning and Automatic Discovery for Operationalizing Science', which is a mouthful, but has a memorable acronym, taking inspiration from the Portal series.

* What technology does this project run on?

GLADOS uses React and Next.js on the frontend, Python on the backend, and MongoDB for data storage, with Firebase for account management. The production server currently runs on a single node Kubernetes cluster within the Rose-Hulman firewall, though older versions primarily used Docker containers.

* Future goals?

In the future, GLADOS hopes to expand the Kubernetes cluster, wider experiment support, and more options for data aggregation, among other bells and whistles. This is currently being handed off to next year's senior capstone project team.
