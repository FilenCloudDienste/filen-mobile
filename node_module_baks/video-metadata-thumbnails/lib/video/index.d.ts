import { IMetadata } from './imetadata';
import { IOption } from './ioption';
import { IThumbnail } from './ithumbnail';
export declare class Video {
    private videoElement;
    private canvas;
    private canvasContext;
    private thumbnails;
    private option;
    private isStarted;
    private count;
    private version;
    constructor(blob: string | Blob);
    getVersion(): string;
    getThumbnails(option?: IOption): Promise<IThumbnail[]>;
    drawThumbnails(): void;
    getMetadata(): Promise<IMetadata>;
}
export declare function getMetadata(blob: string | Blob): Promise<IMetadata>;
export declare function getThumbnails(blob: string | Blob, option?: IOption): Promise<IThumbnail[]>;
