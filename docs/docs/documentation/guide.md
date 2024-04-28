# Overview

Documentation is powered by [MkDocs](https://www.mkdocs.org/) with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/), hosted on [Github Pages](https://pages.github.com/). Older docs still exist on the [Monorepo's Github Wiki](https://github.com/AutomatingSciencePipeline/Monorepo/wiki), but it is being migrated to this page. 

## Setup
For developers, a MkDocs setup is included as part of the dev install script. When working with the documentation locally, remember to activate the venv:

```
source docs/.venv/Scripts/activate
```

Otherwise, mkdocs commands will likely not work.

To exit the venv, while in the venv, run

```
deactivate
```

## Updating
Updating documentation is as simple as updating Markdown files, all contained within the `docs` folder in the Monorepo. 

To preview your changes, this will build the site locally, with automatic updates as you make changes:
```
mkdocs serve
```

## Deploying

With Github Actions, updates to the `main` branch will automatically build and deploy the static site to the `gh-pages` branch.

To deploy manually, run
```
mkdocs gh-deploy --force
```

This updates the `gh-pages` branch with the static site. Keep in mind, if there are unpublished changes, it will display those changes as well, so beware!
<!-- TODO: maybe put this warning in a warning block -->
To preview what files will be generated and published, this generates the static website files under `docs/site/`:
```
mkdocs build
```

## Notes

There are many [MkDocs Plugins](https://github.com/mkdocs/catalog) that may be useful while updating documentation, so consider them as this documentation evolves! [More information about plugins here](https://www.mkdocs.org/dev-guide/plugins/).

The Github Action for automatic deployment was found [here](https://squidfunk.github.io/mkdocs-material/publishing-your-site/#with-github-actions), slightly changed.

If time allows for it, consider looking at [Sphinx](https://www.sphinx-doc.org/en/master/) instead, for documentation. It seems more advanced, with more features and apparently better code integration with documentation, but may be harder to set up and learn.