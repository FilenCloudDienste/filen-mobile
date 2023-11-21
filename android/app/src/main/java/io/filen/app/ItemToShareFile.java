package io.filen.app;

public class ItemToShareFile {
    String uuid;
    String parent;
    FileMetadata metadata;

    ItemToShareFile(String uuid, String parent, FileMetadata metadata) {
        this.uuid = uuid;
        this.parent = parent;
        this.metadata = metadata;
    }
}
