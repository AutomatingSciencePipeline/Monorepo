# Helpful Commands

This page will eventually replace the cheatsheet.md page.

This will be a page describing tasks that are simple but may be helpful to developers in the future.

### Joining a node to the cluster

Run the following command on the control-plane.

```bash
kubeadm token create --print-join-command
```

This will give you a command printed to the terminal. You run the given command on the worker you are attempting to join to the cluster.

Example:

```bash
sudo kubeadm join 123.123.123.123:1234 --token abcde.123465fiasda --discovery-token-ca-cert-hash sha256:1234...abcdef
```

### Pipenv usage

To activate the backend python environment in the terminal, run `source apps/backend/.venv/Scripts/activate`

To activate the documentation python environment in the terminal, run `source docs/.venv/Scripts/activate`

To disable, run `deactivate`

## Tips

### Aliases

You can use command aliases to avoid remembering long, but commonly used terminal commands, or even multiple commands. I (Alan) personally found making aliases for git commands to be useful for general development, even outside of this project. There are many guides online showing how to set up aliases on various terminal environments, it may differ depending on what terminal you use.
