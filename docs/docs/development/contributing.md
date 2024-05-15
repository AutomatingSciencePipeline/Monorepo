# Contributing

This page will eventually contain information on best practices to follow when contributing to the repository.

Check out the [Repository Guide]() to familiarize yourself with each system component.

## Contributing to the Docs

When working on the documentation, your contributions should pass the markdownlint-ci2 engine, implemented by editor extensions such as [this one](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) for Visual Studio Code.

### Edit from the Web

It's possible to edit the docs from the web on Github, but github won't put through the linter described above, so it is suggested you edit them locally.

### Local Copy of the Docs

Github internally keeps track of changes to repository wikis in a secondary git repository.

In order to make editing the docs easier, and help keep them in sync with the main repo,
the documentation repo is included as a [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) in the main repository,
which means it will be cloned when you clone the repo.
As a result, changes to the docs will be noted in commits to the main repo as well by a 'pointer' that holds the commit hash of a certain commit on the docs repo.

Git clients may prevent you from committing changes to the main repo until you commit your docs changes as well.

To commit and push changes to the submodule, you can open it as another repository from whatever git client you're using, then use git commands as normal from there.

You may be on a "detached HEAD" on the wiki repository - this is not a problem, just checkout `master` again and you'll be fine.

- Github desktop: [Add it as an existing repository](https://stackoverflow.com/questions/60086154/how-can-i-push-my-submodules-from-github-desktop) (the local folder you need to select will be named `Monorepo.wiki`)
- Check the [git docs](https://git-scm.com/book/en/v2/Git-Tools-Submodules) for how to use it with git command line.
- In Sourcetree, it shows up on the right side and opens as another tab:
  ![Sourcetree](https://user-images.githubusercontent.com/25965766/213574381-410834ad-14fa-4158-897d-3b1c90773b75.png)

## Version Control
### Main Branch
The main branch cannot be pushed directly; branch protection rules require it to pass our review process. When a group member is finished with their branch, they can submit their work for review via a pull request, which requires a manual code review before it is merged. This will allow it to be checked for style concerns and ensure that bugs and other related issues are prevented from reaching the main branch.

### Feature Branches
Branches that are not the main branch are feature branches, where members can freely alter code without having to worry about causing issues with the main branch or other members.

### Pull Request
When implementing a new feature, create a new branch with the name of the feature and implement it. After committing and pushing the changes, create a `Pull Request` to merge the branch to the main branch. Members need to thoroughly go over the changes to prevent further issues and merge the branch.
