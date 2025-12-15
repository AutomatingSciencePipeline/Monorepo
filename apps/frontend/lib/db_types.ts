export type FileName = string;

export type EpochMilliseconds = number;

export interface HyperparametersCollection {
    hyperparameters: [IntegerHyperparameter | FloatHyperparameter | StringHyperparameter | BooleanHyperparameter | StringListHyperparameter | ParamGroupHyperparameter];
}

export enum HyperparameterTypes {
    INTEGER = 'integer',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'boolean',
    STRING_LIST = 'stringlist',
    PARAM_GROUP = 'paramgroup'
}

// TODO this duplicates information in validators.ts (the Joi schemas), see https://github.com/AutomatingSciencePipeline/Monorepo/issues/114

export interface GenericHyperparameter {
    name: string;
    type: HyperparameterTypes;
}

export interface ParamGroupHyperparameter extends GenericHyperparameter {
    type: HyperparameterTypes.PARAM_GROUP;
    default: string;
    values: { [key: string]: string[] };
}

// TODO JS does not distinguish between integers and floats, so they end up being the same interface, do we want them to differ?
export interface IntegerHyperparameter extends GenericHyperparameter {
    min: number;
    max: number;
    step: number;
    default: number;
    type: HyperparameterTypes.INTEGER;
}

export interface FloatHyperparameter extends GenericHyperparameter {
    min: number;
    max: number;
    step: number;
    default: number;
    type: HyperparameterTypes.FLOAT;
}

export interface BooleanHyperparameter extends GenericHyperparameter {
    default: boolean;
    type: HyperparameterTypes.BOOLEAN;
}

export interface StringHyperparameter extends GenericHyperparameter {
    default: string;
    type: HyperparameterTypes.STRING;
}

export interface StringListHyperparameter extends GenericHyperparameter {
    values: string[];
    default: string;
    type: HyperparameterTypes.STRING_LIST;
}

export interface ExperimentData {
    // TODO make sure these match what python expects as well
    creator: string;
    creatorEmail: string;
    creatorRole: string;
    name: string;
    description: string;
    tags: string[];
    workers: number;
    expId: string; // TODO do we want to ensure this doesn't get stored in fb itself?
    trialExtraFile: FileName;
    trialResult: FileName;
    trialResultLineNumber: number;
    timeout: number;
    sendEmail: boolean;
    scatter: boolean;
    scatterIndVar: string;
    scatterDepVar: string;
    dumbTextArea: string;
    created: EpochMilliseconds;
    hyperparameters: HyperparametersCollection;
    finished: boolean;
    status: string;
    estimatedTotalTimeMinutes: number;
    expToRun: number; // TODO is this used?
    file: string; // TODO rename to something more unique
    startedAtEpochMillis: EpochMilliseconds;
    finishedAtEpochMilliseconds: EpochMilliseconds;
    passes: number;
    fails: number;
    totalExperimentRuns: number;
    experimentExecutable: string;
}
