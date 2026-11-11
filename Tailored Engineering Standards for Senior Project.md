# 6.4.2 Stakeholder Needs and Requirements Definition process

**GLADOS (Automating Science Pipeline).** GLADOS helps researchers run experiments with their own code and tune parameters. Our goal for the year is to extend the existing platform so an AI agent can use experiment results to adjust parameters and run another experiment. Our team sets milestones and decides how to implement the work. Dr. Yoder is our sponsor and client. He approves scope and demos and gives feedback on our progress. We track work in GitHub and use test-first programming, pair programming, and incremental design.

## 1. Prepare for Stakeholder Needs and Requirements Definition

### a. Identify the stakeholders who have an interest in the software system throughout its lifecycle.

**Outcome a.** The researchers who run experiments and tune parameters are the users. Dr. Yoder is our sole sponsor and client. He fills the XP customer role by giving feedback and helping us confirm the overall scope.

### b. Define the stakeholder needs and requirements definition strategy.

**Outcome d.** We start with the yearlong goal for the agent workflow and work out what needs to happen at each milestone. Dr. Yoder gives feedback on the direction. When he raises a specific request, we clarify what he needs, how much is in scope, and when it is needed.

### c. Identify and plan for the necessary enabling systems or services needed to support stakeholder needs and requirements definition.

**Outcome h.** Beck advises teams to “adapt whatever you read in this book to your local conditions.” We use the tools our team already has. Meetings help us clarify what a milestone needs, and GitHub issues help us track the work. During implementation, we sometimes use AI tools to think through how a researcher would use a change.

### d. Obtain or acquire access to the enabling systems or services to be used.

**Outcome h.** The team uses GitHub to track work. Dr. Yoder has access and usually gets updates in meetings or by email, where he can give feedback directly. This keeps him involved without making the issue tracker the main way we communicate.

## 2. Define stakeholder needs

### a. Define context of use within the concept of operations and the preliminary life cycle concepts.

**Outcome b.** A researcher supplies their own code to GLADOS and runs experiments to find parameter values that give the result they are looking for. The planned agent would read the result of one run and use it to adjust parameters for the next.

### b. Identify stakeholder needs.

**Outcome d.** We learn what the project needs as we work toward the milestones and use the existing system. For example, a certificate issue on a school server can require help from outside the team, and documentation from earlier years can be hard to find when we need it.

### c. Prioritize and down-select needs.

**Outcome e.** The Planning Game calls for “combining business priorities and technical estimates.” Our goal is to finish the agent workflow this year, so we use milestones to put its core features ahead of minor bug fixes. The order is flexible as long as the work fits the milestone.

### d. Define the stakeholder needs and rationale.

**Outcome d.** We usually discuss why a change matters and how it helps the milestone when we agree to take it on. When we need a written reminder, we sometimes leave a short note in Teams chat.

## 3. Develop the operational concept and other life cycle concepts

### a. Define a representative set of scenarios to identify the required capabilities that correspond to anticipated operational and other life cycle concepts.

**Outcome b.** A successful scenario starts with a researcher supplying code. The agent reads a run's result and uses it to adjust parameters for another run. That scenario gives us a concrete behavior to test. Researchers handle failed runs and unusable output themselves under the current scope.

### b. Identify the factors affecting interactions between users and the system.

**Outcome b.** Researchers can refer to the GLADOS documentation. Their account role affects which actions they can take, so examples of the workflow should show what the researcher can do with their level of access.

## 4. Transform stakeholder needs into stakeholder requirements

### a. Identify the constraints on a system solution.

**Outcome c.** We are extending an existing platform on school infrastructure and aiming to complete the agent workflow within the academic year. The current scope leaves failed runs and unusable results with the researcher. We take those limits into account when choosing what fits in a milestone.

### b. Identify the stakeholder requirements and functions that relate to critical quality characteristics, such as assurance, safety, security, environment, or health.

**Outcome e.** Account roles already govern which actions users can take. For the agent, a corresponding security requirement would be to allow only actions the researcher has permission to take. Following Beck's advice to “write tests before we code,” we could check that the same action succeeds for an authorized role and is refused for a role without access.

### c. Define stakeholder requirements, consistent with life cycle concepts, scenarios, interactions, constraints, and critical quality characteristics.

**Outcome e.** We can turn the yearlong goal into behaviors we can check one at a time. One requirement for the tuning loop is that the agent uses a successful run's result to adjust parameters for the next run. A demo can show what that looks like in practice.

## 5. Analyze stakeholder requirements

### a. Analyze the complete set of stakeholder requirements.

**Outcome e.** We can use a team meeting to walk through the milestone from the researcher's point of view. That would help us see if the work adds up to a useful step toward the full workflow and whether any parts conflict.

### b. Define critical performance measures that enable the assessment of technical achievement.

**Outcome f.** For a tuning demo, we could check how many iterations complete and whether each parameter change follows from the previous result. We can choose a target when we know what the milestone is meant to demonstrate.

### c. Feed back the analyzed requirements to applicable stakeholders to validate that their needs and expectations have been adequately captured and expressed.

**Outcome g.** In a milestone update or demo, we can show Dr. Yoder what the agent can do and ask if it matches the direction we agreed on. We can use that feedback to adjust the next milestone.

### d. Resolve stakeholder requirements issues.

**Outcome e.** If two proposed changes compete or a requirement is unclear, we can work through the tradeoff as a team and check it against the yearlong goal. We would bring a decision to Dr. Yoder if it changes the agreed scope.

## 6. Manage the stakeholder needs and requirements definition

### a. Obtain explicit agreement with designated stakeholders on the stakeholder requirements.

**Outcome g.** Dr. Yoder approves the project scope and demos. We can use a meeting or email to confirm agreement on what a milestone should deliver, then keep a brief note of his response.

### b. Maintain traceability of stakeholder needs and requirements.

**Outcome i.** When a GitHub issue supports a milestone, we can say which part of the goal it advances and link it to the pull request and any relevant test. That gives the team a short path from the need to the change.

### c. Provide key artifacts and information items that have been selected for baselines.

**Outcome i.** To “travel light,” we could use the agreed issues and any demo checks as our requirements baseline. Linking them to the revision we reviewed would give the team a record of what was in scope at that point.

# 6.4.4 Architecture Definition process

## 1. Prepare for architecture definition

### a. Review pertinent information and identify key drivers of the architecture.

**Outcome e.** Our architecture needs to extend the existing platform, respect account permissions, and support repeated runs. We can review the existing code and documentation to see which parts already support those goals and which would have to change.

### b. Identify stakeholder concerns.

**Outcome a.** Researchers need to be able to run their experiments with the access their accounts allow. We can show Dr. Yoder where the agent would act on the researcher's behalf and use his feedback to decide which actions should stay with the researcher.

### c. Define the Architecture Definition roadmap, approach, and strategy.

**Outcome h.** The agent can already read experiment information. We can build on that in steps, adding parameter changes and another run as the milestones allow. A demo can show whether each increment works before we extend it.

### d. Define architecture evaluation criteria based on stakeholder concerns and key requirements.

**Outcome g.** Beck says “Every abstract decision should be tested.” We could compare architecture options by checking whether each one works with the existing experiment workflow, respects account permissions, and fits the time we have. Using the same checks for each option would make the tradeoffs clearer.

### e. Identify and plan for the necessary enabling systems or services needed to support the Architecture Definition process.

**Outcome j.** To try an architecture change, we need access to the current code, any documentation we can find, and a place to run a small example. Our laptops have limited memory, so we should account for what we can test locally.

### f. Obtain or acquire access to the enabling systems or services to be used.

**Outcome j.** We could verify that teammates can access the repository and run an example in a development environment. If a check depends on school infrastructure, we can find out who can provide access or help resolve a problem.

## 2. Develop architecture viewpoints

### a. Select, adapt, or develop viewpoints and model kinds based on stakeholder concerns.

**Outcome b.** A context view can show how a researcher and their AI tool connect to GLADOS. If we need to see what happens first during a run, an interaction view can show that order.

### b. Establish or identify potential architecture framework(s) to be used in developing models and views.

**Outcome b.** A simple framework could pair a diagram of the main components with a diagram of how they interact during an experiment. Using the same two views for changes makes it easier to compare them with the existing system.

### c. Capture rationale for selection of framework(s), viewpoints and model kinds.

**Outcome b.** Beck's advice is to draw “enough to illuminate a question, then turn to the system.” A short note can explain why a view is useful. For example, an interaction diagram helps when the order of reading results, choosing parameters, and running the next experiment matters.

### d. Select or develop supporting modelling techniques and tools.

**Outcome b.** If a change calls for a diagram, we can use a tool the team can read and edit, then keep the sketch in GitHub for review alongside the code.

## 3. Develop models and views of candidate architectures

### a. Define the software system context and boundaries in terms of interfaces and interactions with external entities.

**Outcome c.** A context diagram can show where the researcher supplies experiment code to GLADOS and where the agent asks GLADOS for information. That makes it clear which interactions cross between GLADOS and the tools or people using it.

### b. Identify architectural entities and relationships between entities that address key stakeholder concerns and critical software system requirements.

**Outcome f.** We can identify which parts of GLADOS accept an experiment, run it, and make the results available. That gives us a starting point for deciding where the agent needs to connect.

### c. Allocate concepts, properties, characteristics, behaviors, functions, or constraints that are significant to architecture decisions of the software system to architectural entities.

**Outcome e.** One possible split gives the agent the job of proposing parameter changes and GLADOS the job of checking permissions and running the experiment. Tests could check what each part is responsible for.

### d. Select, adapt, or develop models of the candidate architectures of the software system.

**Outcome d.** We could sketch the same workflow with an existing GLADOS interface and with a separate one. The sketches would show what each option needs before we spend time implementing it.

### e. Compose views from the models in accordance with identified viewpoints to express how the architecture addresses stakeholder concerns and meets stakeholder and system/software requirements.

**Outcome d.** We can use one example experiment to tie the views together. A component view shows which parts handle the run and its results. An interaction view shows how the result reaches the agent before the next run.

### f. Harmonize the architecture models and views with each other.

**Outcome d.** We can use the same component names in each diagram and walk through one experiment in both views. That would help us catch missing steps or conflicting descriptions of who does what.

## 4. Relate the architecture to design

### a. Identify software system elements that relate to architectural entities and the nature of these relationships.

**Outcome f.** When we work on an agent feature, we can identify which part of the code takes on each responsibility shown in the architecture. That helps us see which pieces need to change together.

### b. Define the interfaces and interactions among the software system elements and external entities.

**Outcome f.** For an agent interface, we can agree on what the agent sends, what GLADOS returns, and how permission errors are reported. We can test those interactions as we build the interface.

### c. Partition, align and allocate requirements to architectural entities and system elements.

**Outcome k.** When breaking a milestone into GitHub issues, we can note which parts of the system handle each requirement. A link to the relevant code change or test can show how the work fits together.

### d. Map software system elements and architectural entities to design characteristics.

**Outcome i.** We can map security to the part that checks account access. Keeping result handling in its own component could also make it easier to test how the agent responds to a result.

### e. Define principles for the software system design and evolution.

**Outcome h.** Beck's approach is to build “the architecture I need now.” We can add agent capabilities one at a time, keep permissions clear, and use regression tests to check that the existing research workflow still works after each change.

## 5. Assess architecture candidates

### a. Assess each candidate architecture against constraints and requirements.

**Outcome g.** We could try a small experiment workflow with each architecture option under the same conditions. We'd look at how well each option works with the existing system, preserves permissions, and fits the time available.

### b. Assess each candidate architecture against stakeholder concerns using evaluation criteria.

**Outcome g.** A demo or walkthrough can show how each option would affect researchers, including which steps they control. We can use Dr. Yoder's feedback to see which option better supports how they use GLADOS.

### c. Select the preferred architecture(s) and capture key decisions and rationale.

**Outcome g.** Once we choose an option, a short note in the issue or pull request can record what we compared and why we picked it. We can refer back to the note if later work brings up the same decision.

### d. Establish the architecture baseline of the selected architecture.

**Outcome h.** We could use the tested commit we reviewed at a milestone as the architecture baseline and link any diagrams or decision notes that apply to it.

## 6. Manage the selected architecture

### a. Formalize the architecture governance approach and specify governance-related roles and responsibilities, accountabilities, and authorities related to design, quality, security, and safety.

**Outcome h.** Beck's principle is that “responsibility be accepted, not given.” The team owns day-to-day architecture decisions and uses pull requests and AI-assisted review. The person proposing an architecture change could explain its impact and a teammate could check that it still respects permissions. Dr. Yoder approves scope and demos.

### b. Obtain explicit acceptance of the architecture by stakeholders.

**Outcome a.** If an architecture decision affects the researcher workflow or project scope, we can show that effect in a milestone demo and ask Dr. Yoder whether the approach fits the goal. A brief note can capture his response.

### c. Maintain concordance and completeness of the architectural entities and their architectural characteristics.

**Outcome i.** In a paired review, one teammate can walk through a change while the other checks that the diagrams, code, and tests still describe the same responsibilities.

### d. Organize, assess and control evolution of the architecture models and views to help ensure that the architectural intent is met and the architectural vision and key concepts are correctly implemented.

**Outcome h.** Beck describes refactoring as a way to “restructure the system without changing its behavior.” If a refactor moves a responsibility to another component, we could update the related diagram and tests in the same pull request so the design is still clear.

### e. Maintain the architecture definition and evaluation strategy.

**Outcome h.** After a demo, we can review whether our architecture checks still cover the workflow we're building. Anything we learn about a limitation or change in scope can inform the checks for the next milestone.

### f. Maintain traceability of the architecture.

**Outcome k.** We can link a milestone issue to the architecture decision it affects and to the change that implements it. That gives us a place to look if the work changes.

### g. Provide key artifacts and information items that have been selected for baselines.

**Outcome h.** At handoff, we can share the reviewed revision and point the next team to the current diagrams, decision notes, and tests. Keeping these together would make the design easier to find than some of the documentation we inherited.

# 6.4.5 Design Definition process

## 1. Prepare for software system design definition

### a. Define the design definition strategy, consistent with the selected life cycle model and anticipated design artifacts.

**Outcome f.** We use test-first programming and incremental design. For the agent workflow, we can design each milestone as a small step, write tests for the behavior it adds, and fill in the design as we learn what that step needs.

### b. Select and prioritize design principles and design characteristics.

**Outcome a.** We'd favor “the simplest design that runs the current test suite.” For the agent work, that means making role permissions and parameter changes easy to test while keeping the design small enough to fit the next milestone.

### c. Identify and plan for the necessary enabling systems or services needed to support design definition.

**Outcome g.** Before starting a change, we can identify which code and documentation we need and what setup will let us run a quick test. That helps us plan work we can try with the resources available.

### d. Obtain or acquire access to the enabling systems or services to be used.

**Outcome g.** We can make sure the teammates doing the work have repository access and can run a relevant test in their development environment. A quick check early in the milestone gives us time to resolve setup issues.

## 2. Establish designs related to each software system element

### a. Transform architectural and design characteristics into the design of software system elements.

**Outcome a.** If GLADOS handles permissions, the design of that part needs to specify how it treats a request from an account without access. A test for that behavior gives us a concrete way to check the design.

### b. Define and prepare or obtain the necessary design enablers.

**Outcome c.** A small experiment and sample output could help us work out what information the agent needs to choose the next parameters. We could use the same example when designing and testing that part of the workflow.

### c. Examine design alternatives and feasibility of implementation.

**Outcome e.** In pair programming, Beck describes one person as “thinking more strategically.” One teammate could try adapting the existing code for a new agent action while the other considers what it would take to test and maintain. Together they can decide whether the change is feasible.

### d. Refine or define the interfaces among the software system elements and with external entities.

**Outcome d.** We can define what the agent supplies when it requests the next experiment and what GLADOS returns. Tests can capture those inputs and outputs so both sides of the interface agree as we make changes.

### e. Establish the design artifacts.

**Outcome f.** We can use the code and tests to show how each component behaves. A short diagram or note can capture a design decision that would be hard to understand from the implementation alone.

## 3. Assess alternatives for obtaining software system elements

### a. Determine technologies required for each element composing the software system.

**Outcome a.** We can start by checking which tools the existing GLADOS code uses for the component we need to change. If an existing tool meets the need, keeping it gives us less setup and maintenance work.

### b. Identify candidate alternatives for the software system elements.

**Outcome e.** Beck expects design discussions to lead to “a series of experiments addressing the questions raised during the session.” For a new agent action, we could compare reusing an existing component, adapting it, or building a small new one. A short trial can help us find which options are practical.

### c. Assess each candidate alternative against criteria developed from expected design characteristics and element requirements to determine suitability for the intended application.

**Outcome e.** We could try the same small workflow and permission check with each candidate. The results would help us compare the effort to integrate, test, and maintain each one.

### d. Choose the preferred alternatives among candidate design solutions for the software system elements.

**Outcome e.** We would choose the simplest option that satisfies the tests for the milestone. The pull request can record why we chose it and when it might be worth revisiting.

## 4. Manage the design

### a. Capture the design and rationale.

**Outcome f.** Beck says the code and tests “must communicate everything you want to communicate.” We can use the pull request to record why we chose a design and which alternatives we considered. A brief explanation is useful when the code shows how a change works and the reason for the choice is harder to see.

### b. Establish traceability between the detailed design elements, the system/software requirements, and the architectural entities of the software system architecture.

**Outcome h.** We can link the GitHub issue for a requirement to the part of the design it affects and the pull request or test that shows how we addressed it. That gives us something to follow if the design changes.

### c. Determine the status of the software system and element design.

**Outcome a.** In a team meeting, we can use issues and pull requests to see which parts of the design still need a decision, which have been implemented, and which have been tested. That helps us decide what is ready for the next demo.

### d. Provide key artifacts and information items that have been selected for baselines.

**Outcome f.** At handoff, we can point to one revision that has the current interface examples, decision notes, code, and tests. The next team can use those files to understand the design and run the checks against the version they describe.

**References**

- ISO/IEC/IEEE 12207:2017, *Systems and software engineering: Software life cycle processes*, 6.4.2, 6.4.4, and 6.4.5.
- Kent Beck, *Extreme Programming Explained: Embrace Change*, 2nd ed., Addison-Wesley.
- [GLADOS Monorepo](https://github.com/AutomatingSciencePipeline/Monorepo).
