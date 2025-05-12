'use server';
import * as k8s from '@kubernetes/client-node';
import {auth} from '../auth';
import { getDocumentFromId } from './mongodb_funcs';
 
export async function getK8sLogs(expId: string) {
    // Check if the user is authenticated
    const session = await auth();
    if (!session) {
        throw new Error('User not authenticated');
    }
    // Check if the user has permission to access the experiment
    const exp = await getDocumentFromId(expId);
    if (!exp) {
        throw new Error('Experiment not found');
    }
    const creatorId = (exp as { _id: string; creator?: string }).creator;
    if (creatorId !== session?.user?.id) {
        throw new Error('User does not have permission to access this experiment');
    }
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const jobName = `runner-${expId}`;
    const result = k8sApi.listNamespacedPod({ namespace: 'default' }).then( async (res) => {
        // This will return a V1PodList object
        const podList = res;
        const podName = podList.items.find((pod) => pod.metadata?.name?.startsWith(jobName))?.metadata?.name;
        if (!podName) {
            throw new Error(`Pod not found for experiment ID: ${expId}`);
        }

        const log = await k8sApi.readNamespacedPodLog({ name: podName, namespace: 'default' });
        return log;
    });

    return result;
}

export async function triggerRedeploy() {
    const session = await auth();
    if (!session) {
        throw new Error('User not authenticated');
    }
    if (!session?.user?.role || session?.user?.role !== 'admin') {
        throw new Error('User does not have permission to trigger redeploy');
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);

    const deployments = [
        { name: 'glados-frontend', namespace: 'default' },
        { name: 'glados-backend', namespace: 'default' },
    ];

    const patchBody = {
        spec: {
            template: {
                metadata: {
                    annotations: {
                        'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                    },
                },
            },
        },
    };

    // Patch each deployment
    for (const { name, namespace } of deployments) {
        await appsApi.patchNamespacedDeployment({
            name,
            namespace,
            body: patchBody,
            pretty: 'true', // Optional pretty-printing
            }, k8s.setHeaderOptions('Content-Type', k8s.PatchStrategy.MergePatch));
    }
}

