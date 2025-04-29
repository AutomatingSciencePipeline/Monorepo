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
    if (exp.creator !== session?.user?.id) {
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
