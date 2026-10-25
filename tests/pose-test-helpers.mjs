// Exclude the declared playback fields, including the authored-art flag added
// by combat-animation165. Unknown/non-numeric geometry
// fields must still fail finite-channel checks rather than being filtered out.
export function poseChannels({mode,time,phase,reduced,profileFrame,...channels}){return channels;}
