package io.filen.app;

public class Item {
    String uuid;
    String parent;
    String name;
    String type;
    String mime;
    long size;
    long timestamp;
    long lastModified;
    String key;
    long chunks;
    String region;
    String bucket;
    int version;

    Item (String uuid, String parent, String name, String type, String mime, long size, long timestamp, long lastModified, String key, long chunks, String region, String bucket, int version) {
        this.uuid = uuid;
        this.parent = parent;
        this.name = name;
        this.type = type;
        this.mime = mime;
        this.size = size;
        this.timestamp = timestamp;
        this.lastModified = lastModified;
        this.key = key;
        this.chunks = chunks;
        this.region = region;
        this.bucket = bucket;
        this.version = version;
    }
}

