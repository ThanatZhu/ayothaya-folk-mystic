// Exclude only the four declared playback fields. Unknown/non-numeric geometry
// fields must still fail finite-channel checks rather than being filtered out.
export function poseChannels({mode,time,phase,reduced,...channels}){return channels;}
