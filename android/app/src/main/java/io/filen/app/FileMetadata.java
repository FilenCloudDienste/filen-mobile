package io.filen.app;

public class FileMetadata {
    String name;
    long size;
    String mime;
    String key;
    long lastModified;
    String hash;

    FileMetadata (String name, long size, String mime, String key, long lastModified, String hash) {
        this.name = name;
        this.size = size;
        this.mime = mime;
        this.key = key;
        this.lastModified = lastModified;
        this.hash = hash;
    }
}

