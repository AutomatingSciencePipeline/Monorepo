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