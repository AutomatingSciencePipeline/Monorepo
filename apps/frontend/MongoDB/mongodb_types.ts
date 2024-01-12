// TODO there is probably some mongo typescript api thing we can use to help with this

export type FileName = string;
export type EpochMilliseconds = number;
export interface MongoDocument {
    _id: string;
}

export interface ProjectZip extends MongoDocument {
    fileContent: string;
};

export interface ResultsCsv extends MongoDocument {
    resultContent: string;
};

export interface HyperparametersCollection {
    hyperparameters: [IntegerHyperparameter | FloatHyperparameter | StringHyperparameter | BooleanHyperparameter]
}

export interface GenericHyperparameter {
    name: string;
    type: HyperparameterTypes;
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

export interface IntegerHyperparameter extends GenericHyperparameter {
    min: number;
    max: number;
    step: number;
    default: number;
    type: HyperparameterTypes.INTEGER;
}

export enum HyperparameterTypes {
    INTEGER = 'integer',
    FLOAT = 'float',
    STRING = 'string',
    BOOLEAN = 'boolean',
}
export interface ExperimentData {
    // TODO make sure these match what python expects as well
    creator: String;
    name: string;
    description: string;
    verbose: boolean;
    workers: number;
    expId: String; // TODO do we want to ensure this doesn't get stored in fb itself?
    trialExtraFile: FileName;
    trialResult: FileName;
    timeout: number;
    keepLogs: boolean;
    scatter: boolean;
    scatterIndVar: string;
    scatterDepVar: string;
    dumbTextArea: string;
    created: EpochMilliseconds;
    hyperparameters: HyperparametersCollection;
    finished: boolean;
    estimatedTotalTimeMinutes: number;
    expToRun: number; // TODO is this used?
    // file: StorageReference; // TODO rename to something more unique
    startedAtEpochMillis: EpochMilliseconds;
    finishedAtEpochMilliseconds: EpochMilliseconds;
    passes: number;
    fails: number;
    totalExperimentRuns: number;
}

