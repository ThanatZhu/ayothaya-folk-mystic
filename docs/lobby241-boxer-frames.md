# Boxer frame and arrival preview 241

The male boxer atlas contains a female-style chest wrap in recovery frame 10 and raised-knee frame 8, including the crafted weapon variant. Remap male recovery to the existing male guard frame 0 and male knee to the existing male kick frame 9. This deliberately reuses reviewed male poses instead of presenting an outfit swap. Female frames remain untouched. Damage, timings and combo definitions do not change; the old knee animation visually uses a kick.

The login class showcase and class dialog now use the same automatic run/attack cycle and authored-run compatibility rules as character selection. Remove the additional CSS orbit, retain the canvas foot pedestal, respect reduced motion, and limit canvas drawing to 30 fps.

Validation: inspect male attack contact sheet for basic/crafted variants; test all seven class selections, automatic poses, reduced motion, and existing character selection at desktop/portrait/landscape. Evidence in local outputs/lobby241. Frontend/assets only: publish frontend-live, never restart the backend for this change.
