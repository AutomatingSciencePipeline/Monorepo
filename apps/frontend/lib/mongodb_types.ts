// TODO there is probably some mongo typescript api thing we can use to help with this

export interface MongoDocument {
    _id: string;
}

export interface ProjectZip extends MongoDocument {
    fileContent: string;
};

export interface ResultsCsv extends MongoDocument {
    resultContent: string;
};

