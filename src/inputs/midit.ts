import { ControlChangeMessageEvent, NoteMessageEvent, WebMidi } from "webmidi";
import { v4 as uuidv4 } from 'uuid';

export type MidiControllerEventListener = (event: ControlChangeMessageEvent) => void;
export type MidiNoteEventListener = (event: NoteMessageEvent) => void;

interface ListenerObject<T> {
    listener: T;
    uuid: string;
}

export class Midi {
    controllerListeners: ListenerObject<MidiControllerEventListener>[] = [];
    noteListeners: ListenerObject<MidiNoteEventListener>[] = [];

    addControllerListener(listener: MidiControllerEventListener): string {
        const uuid = uuidv4();

        this.controllerListeners.push({
            listener,
            uuid,
        })

        return uuid
    }

    removeControllerListener(uuid: string) {
        this.controllerListeners = this.controllerListeners.filter((l) => l.uuid !== uuid);
    }

    removeNoteListener(uuid: string) {
        this.noteListeners = this.noteListeners.filter((l) => l.uuid !== uuid);
    }

    addNoteListener(listener: MidiNoteEventListener): string {
        const uuid = uuidv4();

        this.noteListeners.push({
            listener,
            uuid,
        })

        return uuid
    }

    private noteListener(event: NoteMessageEvent) {
        console.log(event);

        this.noteListeners.forEach(l => l.listener(event))
    }

    private controllerListener(event: ControlChangeMessageEvent) {
        console.log(event);

        this.controllerListeners.forEach(l => l.listener(event))
    }

    constructor() {
        WebMidi.enable().then(() => {
            const mySynth = WebMidi.inputs[0];

            console.log(mySynth);

            mySynth?.channels.forEach((chan) => {
                chan.addListener("noteon", (e) => this.noteListener(e));
                chan.addListener("controlchange", (e) => this.controllerListener(e));
            })
        }).catch(err => alert(err));
    }
}