package io.filen.app;

public class ItemToShareFolder {
    String uuid;
    String parent;
    FolderMetadata metadata;

    ItemToShareFolder(String uuid, String parent, FolderMetadata metadata) {
        this.uuid = uuid;
        this.parent = parent;
        this.metadata = metadata;
    }
}
