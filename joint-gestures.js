// Authored joint target deltas in neutral sprite coordinates, plus weapon wrist
// rotation in radians. IK resolves shoulders/elbows and hips/knees at runtime.
export const JOINT_GESTURES={
 ready:{handLX:.015,handLY:-.025,handRX:-.025,handRY:-.045,footLX:-.018,footRX:.018},
 jab:{handRX:.13,handRY:-.065,handLX:.025,handLY:-.035,footRX:.04},
 cross:{handLX:.14,handLY:-.07,handRX:-.025,handRY:-.035,wristL:.55,footLX:.03},
 sweep:{handLX:.08,handLY:.035,handRX:.09,handRY:.035,wristL:1.1,wristR:-.7,footRX:.045},
 high:{handLX:-.015,handLY:-.12,handRX:.02,handRY:-.12,wristL:-.65,wristR:.35},
 chop:{handLX:.08,handLY:.055,handRX:.08,handRY:.045,wristL:1.05,wristR:-.4,footRX:.035},
 brace:{handLX:.035,handLY:-.055,handRX:-.035,handRY:-.055,footLX:-.025,footRX:.025,wristL:.2,wristR:-.2},
 shove:{handLX:.12,handLY:-.06,handRX:.12,handRY:-.07,footLX:-.025,footRX:.04},
 thrust:{handLX:.16,handLY:-.06,handRX:.12,handRY:-.07,wristL:1.2,wristR:-.4,footLX:-.03,footRX:.055},
 recoil:{handLX:.015,handLY:-.015,handRX:-.035,handRY:-.035,footRX:.015},
 low:{handLY:.035,handRY:.045,handLX:.02,handRX:-.015,footLX:-.03,footRX:.03},
 rise:{handLY:-.08,handRY:-.11,handLX:-.03,handRX:.04,footLY:-.018,footRY:-.018},
 kick:{handLX:-.04,handLY:-.04,handRX:.025,handRY:-.04,footRX:.19,footRY:-.16},
 knee:{handLX:.04,handLY:-.055,handRX:-.035,handRY:-.05,footRX:.045,footRY:-.18},
 elbow:{handRX:-.07,handRY:-.085,handLX:.05,handLY:-.04,wristR:1.1,footRX:.02},
 draw:{handLX:-.015,handLY:-.11,handRX:.045,handRY:-.085,wristR:.15,footLX:-.025,footRX:.02},
 release:{handLX:.11,handLY:-.095,handRX:.07,handRY:-.085,wristR:.12,footRX:.025},
 sky:{handLX:.025,handLY:-.15,handRX:.025,handRY:-.16,wristL:-.5,wristR:.6},
 plant:{handLX:.025,handLY:.065,handRX:.015,handRY:.035,wristL:.1,footLX:-.025,footRX:.025},
 palm:{handLX:.025,handLY:-.035,handRX:.11,handRY:-.11,wristR:-.2},
 open:{handLX:-.07,handLY:-.075,handRX:.085,handRY:-.085,wristL:-.2,wristR:.25},
 pray:{handLX:.07,handLY:-.065,handRX:-.08,handRY:-.065,wristL:-.3,wristR:.3},
 breathe:{handLX:.012,handLY:-.012,handRX:-.012,handRY:-.012},
 bow:{handLX:.04,handLY:-.03,handRX:-.04,handRY:-.03},
 ward:{handLX:-.055,handLY:-.1,handRX:.065,handRY:-.11,wristL:-.25,wristR:.4,footLX:-.02,footRX:.02},
 step:{footLX:.045,footLY:-.045,footRX:-.035,handRX:.035,handLX:-.025},
 evade:{footLX:-.055,footRX:.045,footRY:-.045,handLX:-.025,handRX:-.015,handRY:-.025},
 dash:{footLX:-.06,footLY:-.035,footRX:.08,footRY:-.03,handLX:-.045,handRX:.055,handRY:-.075},
 turn:{handLX:.06,handLY:-.035,handRX:-.06,handRY:-.025,footLX:.025,footRX:-.02,wristL:.5,wristR:.4},
 land:{footLX:-.03,footRX:.03,handLX:-.025,handRX:.03},
 float:{handLX:-.05,handLY:-.08,handRX:.06,handRY:-.08,footLY:-.06,footRY:-.04},
 mend:{handLX:.05,handLY:.025,handRX:-.055,handRY:.015},
 focus:{handLX:.035,handLY:-.04,handRX:-.035,handRY:-.05},
 seal:{handLX:.01,handLY:-.04,handRX:.075,handRY:-.09,wristR:.9,wristL:-.25},
 spiral:{handLX:.03,handLY:-.095,handRX:.07,handRY:-.12,wristL:1.3,wristR:1.1,footRX:.045}
};
export function gestureJoints(name,classId){
 const p={...JOINT_GESTURES[name]};
 // Guarded fists already start beside the face; weapon carriers start lowered.
 if(classId==='boxer'){p.handLY=(p.handLY??0)*.4;p.handRY=(p.handRY??0)*.4;if(name==='jab'||name==='shove')p.handRY=.045;}
 if(classId==='acolyte'){p.wristL=(p.wristL??0)*.35;p.wristR=(p.wristR??0)*.35;}
 if(classId==='shaman'&&['seal','spiral','high','sky'].includes(name))p.wristL=(p.wristL??0)*.35;
 return p;
}
