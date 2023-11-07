package io.filen.app;

@FunctionalInterface
public interface ErrorCallback {
    void onResult(Throwable err);
}
