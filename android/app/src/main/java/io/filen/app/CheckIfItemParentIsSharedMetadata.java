package io.filen.app;

public class CheckIfItemParentIsSharedMetadata {
    String uuid;
    String name;
    long size;
    String mime;
    String key;
    long lastModified;
    String hash;

    CheckIfItemParentIsSharedMetadata (String uuid, String name, long size, String mime, long lastModified, String hash) {
        this.uuid = uuid;
        this.name = name;
        this.size = size;
        this.mime = mime;
        this.lastModified = lastModified;
        this.hash = hash;
    }
}

