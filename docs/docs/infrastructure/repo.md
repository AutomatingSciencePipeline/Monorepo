# Repository Structure

## Folder Structure

- **apps/**  
  Contains the core system code.  
  - **backend/**: Written in Python, this folder contains logic for MongoDB and the API.
  - **runner/**: Also written in Python, this folder contains the logic for executing experiments on the Kubernetes cluster.
  - **frontend/**: Written in TypeScript, this folder contains the Next.js app that serves the web interface.

- **docs/**  
  Contains all documentation for the system.

- **example_experiments/**  
  Contains C, Java, and Python experiments already set up to work with GLADOS.  
  Use these as references for making your own programs compatible with GLADOS.

## Branch Protection

- The `main` branch is protected.
  - **At least one other team member must review pull requests before merging.**
- The `development` branch is **not protected** and can be pushed to directly.
  - Use this branch to test changes before creating a pull request to `main`.

Recommended Workflow:

1. Create a branch off `main` for your feature or fix.

2. Merge your changes into `development` and test them there.

3. Create a pull request from `development` to `main`.

4. Link related issues to the pull request. This will automatically close the issues when the pull request is merged.

5. Get reviewed and merge.

## GitHub Task Board

- Access the Task Board by navigating to **“Projects” → “Task Board”** on the repository page.

- Format issue titles as [actual hours taken]/[estimated hours to complete], e.g., Add Custom "Tags" to Experiments -_/6. This helps track how work is being estimated and executed.

- The Task Board contains **11 categories**:

### Task Board Categories

| Category         | Description                                                                                                 |
|------------------|------------------------------------------------------------------------------------------------------------|
| **TroubleShooting** | Issues with bugs that need further fixing before they can be marked as done.                              |
| **Consult Jason**   | Issues that are roadblocked and require clarification or input from Jason before progress can be made.    |
| **Onboarding**      | Good starter issues for new teams. Look here first if you’re not sure what to work on.                    |
| **Backlog**         | Issues that need to be done and haven’t been started yet, but are not currently prioritized.              |
| **Ready**           | Issues that have not been started yet and are ready for someone to pick up.                               |
| **Roadblocked**     | Issues that cannot progress because they require changes from another team member.                        |
| **On Hold**         | Issues that were in progress but are paused due to other priorities.                                      |
| **In Progress**     | Issues currently being worked on by someone.                                                              |
| **In Review**       | Issues completed and waiting for review by other team members before merging.                             |
| **Done**            | Issues that have been completed.                                                                          |
| **Eventually**      | Issues that need to be completed, but cannot be addressed for the foreseeable future.                     |

