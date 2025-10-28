const fs = require('fs');
const path = require('path');

// Comprehensive tips for all exercises
const exerciseTips = {
  'Seated Knee Extensions': {
    formTips: 'Sit with back fully supported and core engaged. Lift leg smoothly, don\'t kick up. Hold leg steady at top - no bouncing. Flex foot to engage more muscle. Breathe out during extension, in during lowering. Stop if knee pain or unusual fatigue.',
    modifications: 'Easier: Lift leg only halfway, reduce hold to 1-2 seconds, perform 5-8 reps only. Harder: Add ankle weights (start with 1 lb), increase hold to 5 seconds, point and flex foot at top. Can add resistance band around ankle for added challenge after week 5.',
  },
  'Sit-to-Stand Practice': {
    formTips: 'Feet should be hip-width apart and slightly behind knees. Lean forward (nose over toes) before standing. Push through heels, not toes. Use arms on chair for light assist only if needed. Lower with control - don\'t plop down. Stop if dizzy or short of breath. Monitor heart rate response.',
    modifications: 'Easier: Use chair with arms for support, elevate chair height with cushion, reduce to 3 reps only, take longer rest between reps. Harder: Eliminate arm use, use lower chair, increase to 10 reps, slow down descent phase to 4-5 seconds. Can hold light weights after week 6.',
  },
  'Wall Push-Ups (Modified)': {
    formTips: 'IMPORTANT: Only after week 4 when sternum is stabilizing. Keep body in straight line from head to heels. Lower slowly over 2-3 seconds. Elbows should go back at 45 degrees, not straight out. Stop immediately if sternum clicking/pain. Breathe in going down, out pushing up. Start conservatively.',
    modifications: 'Easier: Stand further from wall (less angle), reduce to 5 reps, perform very shallow bend only. Harder: Step closer to wall (more angle), increase to 12 reps, add 2-second hold at bottom, slow tempo to 3-2-3 count. Progress to counter height push-ups when ready.',
  },
  'Standing March': {
    formTips: 'Use support lightly for balance only, not to hold body weight. Keep standing leg slightly bent. Lift knee only to comfortable height - hip level is not required initially. Maintain upright posture, don\'t lean back. Breathe rhythmically. Stop if excessively winded or dizzy.',
    modifications: 'Easier: Lift knees only 6 inches, slow the pace, reduce to 10 reps per set, use firm support. Harder: Lift knees to hip level, increase pace, reduce support to fingertip touch, add opposite arm reach, increase to 30 reps. Progress to no support when balance improves.',
  },
  'Neck Rotation Stretch': {
    formTips: 'Move slowly and gently - neck is delicate. Turn head only as far as comfortable without forcing. Keep shoulders down and relaxed. If you feel pinching or sharp pain, reduce range. Breathe normally throughout stretch. Never bounce or jerk.',
    modifications: 'Easier: Turn head only partway, reduce hold to 5 seconds, perform 3 reps per side only. Harder: Increase hold to 15-20 seconds, add gentle pressure with hand, combine with shoulder rolls. Can be done multiple times per day for relief.',
  },
  'Shoulder Rolls': {
    formTips: 'Make smooth circles with shoulders, not jerky movements. Keep arms completely relaxed. Roll through full range - up, back, down, forward. Don\'t force or rush. Breathe naturally. This should feel releasing, not effortful.',
    modifications: 'Easier: Make smaller circles, reduce to 5 reps each direction, sit with back support. Harder: Make larger circles, increase to 15 reps each direction, stand while performing, combine with arm swings. Can add alternating rolls (one shoulder at a time).',
  },
  'Wrist Circles': {
    formTips: 'Make full circles with hands, not just wiggling. Keep forearms still, movement only at wrist. No pain should occur. Breathe normally. Can do this frequently throughout day, especially if hands feel stiff.',
    modifications: 'Easier: Make smaller circles, reduce to 5 reps each direction, rest elbows on armrests. Harder: Make larger circles, increase to 15 reps, add wrist flexion/extension holds, clasp hands and circle together. Can add light grip strengthening with soft ball.',
  },
  'Slow Walking (Indoor)': {
    formTips: 'Start very slowly - pace isn\'t important initially. Maintain upright posture, shoulders back. Breathe rhythmically through nose and mouth. Stay within talk test range (can speak in sentences). Use assistive device if balance is an issue. Stop immediately if chest pain, extreme shortness of breath, or dizziness.',
    modifications: 'Easier: Walk for just 3-5 minutes, take frequent breaks, use walker or cane, stay close to walls/support. Harder: Increase duration by 2 minutes per session, add gentle arm swings, include slight variations in pace. Can progress to hallway laps or around block when ready.',
  },
  'Treadmill Walking (Level)': {
    formTips: 'Use safety clip always. Start very slow (1.0-1.5 mph initially). Hold rails lightly only if needed for balance, not to support body weight. Keep eyes forward, not down at feet. Maintain natural walking stride. Monitor heart rate stays in prescribed zone. Never jump off a moving treadmill.',
    modifications: 'Easier: Start at 0.8-1.0 mph, use rails for balance, limit to 5-10 minutes, take mid-session break. Harder: Gradually increase to 2.5-3.0 mph, release handrails, increase duration to 30 minutes, add 0.5-1% incline after week 8. Always warm up and cool down with slower pace.',
  },
  'Stationary Bike (Low Resistance)': {
    formTips: 'Adjust seat so knee has slight bend at bottom of pedal stroke. Keep resistance very light initially. Maintain upright posture, no hunching. Pedal smoothly in circles, not pushing hard. Monitor heart rate continuously. Stop if you feel chest pain, excessive breathlessness, or leg cramping.',
    modifications: 'Easier: Start with zero resistance, pedal for just 5-10 minutes, keep RPM at 40-50, take break mid-session. Harder: Gradually add light resistance, increase to 25-30 minutes, increase RPM to 60-70, add short intervals of slightly higher resistance. Can use recumbent bike if more comfortable.',
  },
  'Step-Ups (Low Step)': {
    formTips: 'Use handrail for balance. Step fully onto platform with entire foot. Push through heel of stepping leg. Step down slowly and controlled - descent is harder on heart. Breathe continuously, exhale during step up. Stop if knee pain or excessive breathlessness. Start with very low step (4 inches).',
    modifications: 'Easier: Use 2-3 inch step, hold rail firmly, reduce to 5 reps, rest longer between sets. Harder: Progress to 6-8 inch step, reduce rail support, increase to 15 reps, alternate leading leg each rep. Can add light handheld weights after week 8.',
  },
  'Standing Hip Abduction': {
    formTips: 'Stand tall with core engaged. Keep standing leg slightly bent. Lift leg directly to side, don\'t lean or shift weight. Toe should point forward, not up. Control the lowering - don\'t let leg drop. Keep hips level, don\'t hike hip. Breathe normally.',
    modifications: 'Easier: Lift leg only 6 inches, hold chair firmly, reduce to 8 reps, rest between sides. Harder: Lift leg higher (not above hip), hold at top for 2 seconds, reduce chair support, add ankle weights (1-2 lbs). Can add resistance band around ankles.',
  },
  'Standing Hip Extension': {
    formTips: 'Keep torso upright, don\'t lean forward. Squeeze glutes to lift leg back. Keep knee straight but not locked. Don\'t arch lower back excessively. Control the movement - no swinging. Standing leg slightly bent. Stop if lower back pain occurs.',
    modifications: 'Easier: Lift leg only 6-8 inches back, hold chair firmly, reduce to 8 reps. Harder: Lift leg higher, hold for 3 seconds, use fingertip support only, add ankle weights. Can progress to resistance band around ankles for more challenge.',
  },
  'Seated Row (Resistance Band)': {
    formTips: 'Sit tall with core engaged throughout. Pull shoulder blades together, not just bending elbows. Keep elbows close to body. Return with control, don\'t let band snap back. Exhale during pull, inhale during release. Stop if sternum discomfort - this engages chest muscles indirectly.',
    modifications: 'Easier: Use lighter resistance band, reduce to 8 reps, perform single arm rows. Harder: Use stronger band, increase to 15 reps, add 2-second hold at chest, slow tempo to 2-2-2. Can perform standing if preferred after week 8.',
  },
  'Bicep Curls (Light Weight)': {
    formTips: 'Keep elbows stationary at sides, don\'t swing them. Curl weight with smooth motion, no jerking. Control the lowering phase (2-3 seconds down). Keep wrists straight, don\'t bend them. Exhale during curl, inhale during lower. Core engaged, don\'t arch back.',
    modifications: 'Easier: Use 0.5-1 lb weights or no weight, reduce to 8 reps, perform seated. Harder: Increase to 3-5 lbs, increase to 15 reps, alternate arms, add pause at top. Can progress to hammer curls or concentration curls for variety.',
  },
  'Brisk Walking': {
    formTips: 'Walk fast enough to elevate heart rate but can still talk. Swing arms naturally at sides. Land heel first, roll through foot. Take deep breaths rhythmically. Use talk test - can speak sentences but not sing. Monitor for unusual shortness of breath, chest discomfort, or extreme fatigue.',
    modifications: 'Easier: Reduce pace slightly, shorten duration to 15-20 minutes, take 2-minute slow-down breaks. Harder: Increase pace gradually, extend to 40-45 minutes, add hills or stairs, use walking poles for upper body engagement. Track distance and try to gradually increase.',
  },
  'Incline Walking (Treadmill)': {
    formTips: 'Don\'t hold rails tightly - light fingertip touch only if needed. Lean slightly into incline but stay upright. Shorten stride on incline. Breathe deeply and rhythmically. Monitor heart rate closely - incline increases demand significantly. Start with minimal incline (0.5-1%).',
    modifications: 'Easier: Start at 0.5% incline only, reduce speed, limit to 10-15 minutes, alternate flat and incline minutes. Harder: Gradually increase to 3-5% incline, maintain speed, extend duration, reduce handrail use. Always include 5-minute flat warm-up and cool-down.',
  },
  'Stationary Bike (Moderate Resistance)': {
    formTips: 'Resistance should allow you to pedal smoothly. If you\'re grinding or bouncing in seat, reduce resistance. Keep shoulders relaxed. Maintain conversation-level breathing. Check heart rate every 5 minutes. If you feel excessive leg fatigue or breathlessness, reduce resistance immediately.',
    modifications: 'Easier: Use light resistance only, reduce to 15-20 minutes, keep RPM at 50-60, take mid-session break. Harder: Gradually increase resistance, extend to 35-40 minutes, increase RPM to 70-80, add interval training (vary resistance). Can try standing briefly on pedals if comfortable.',
  },
  'Elliptical Training': {
    formTips: 'Keep feet flat on pedals throughout. Use both arms and legs equally. Stand upright, don\'t lean heavily on handles. Move smoothly - elliptical should be nearly silent. Start with very low resistance. Monitor heart rate constantly. Stop if you feel unsteady or overly fatigued.',
    modifications: 'Easier: Use zero resistance, move slowly, focus on forward direction only, limit to 10 minutes. Harder: Add light resistance, increase speed, try reverse direction, extend to 30 minutes, use arms more actively. Can also use without holding handles for better balance challenge.',
  },
  'Mini Squats': {
    formTips: 'Feet shoulder-width, toes slightly out. Squat only 1/4 depth initially (knees bend just slightly). Keep weight in heels, not toes. Chest up, look forward. Don\'t let knees cave inward. Breathe in going down, out standing up. Use chair for safety backup.',
    modifications: 'Easier: Hold chair throughout, squat just a few inches, reduce to 8 reps, widen stance. Harder: Reduce chair support, squat to 1/2 depth, increase to 15 reps, hold for 2 seconds at bottom. Can add light weight held at chest after week 9.',
  },
  'Standing Calf Raises': {
    formTips: 'Rise up smoothly on balls of feet. Hold balance at top. Lower heels below starting point if possible (stretch). Keep core engaged. Don\'t bounce. Use support for balance only. Breathe normally throughout. Stop if calf cramping.',
    modifications: 'Easier: Hold support firmly, rise only partway, reduce to 10 reps, rest between sets. Harder: Use fingertip support only, hold at top 3-4 seconds, increase to 20 reps, try single-leg raises. Can add weight by holding dumbbells after week 9.',
  },
  'Lat Pulldown (Light Weight)': {
    formTips: 'Sit with thighs secured under pad. Pull bar down to upper chest, not behind neck. Lean back slightly (10-15 degrees). Squeeze shoulder blades down and together. Control the return - don\'t let weight stack slam. Exhale during pull, inhale during release.',
    modifications: 'Easier: Use minimal weight, perform partial range, reduce to 8 reps, take longer rest. Harder: Increase weight gradually, pull to chest, increase to 15 reps, vary grip width. Can substitute resistance band pulldowns if no machine available.',
  },
  'Overhead Press (Light Weight)': {
    formTips: 'IMPORTANT: Only after 8+ weeks and complete sternum healing. Press straight up, not forward. Keep core tight, don\'t arch back. Lower weights to shoulder level with control. Breathe out during press, in during lowering. Stop immediately if any sternum discomfort.',
    modifications: 'Easier: Use 1-2 lbs only, perform seated with back support, reduce to 6-8 reps, press to partial height. Harder: Increase to 8-10 lbs, perform standing, increase to 12 reps, add pause at top. Can alternate arms for added control.',
  },
  'Chest Fly (Light Weight)': {
    formTips: 'CRITICAL: Only after complete sternum healing (8+ weeks minimum). Keep slight bend in elbows throughout. Open arms only to comfortable stretch, not beyond shoulder line. Move slowly and controlled. Stop immediately if any chest clicking or pain. Start with very light weight (2-3 lbs max).',
    modifications: 'Easier: Use 1-2 lbs only, reduce arm opening range, perform 6-8 reps only, keep arms higher (less stretch). Harder: Increase to 4-5 lbs, full comfortable range, increase to 12 reps, slow tempo. Can substitute resistance band chest fly.',
  },
  'Abdominal Bracing': {
    formTips: 'Tighten abs as if bracing for a punch - firm but not maximum clench. Keep breathing normally - don\'t hold breath. Back stays in neutral position. Feel all abdominal muscles engage. This is isometric (no movement). Stop if this causes back pain.',
    modifications: 'Easier: Hold for just 3-5 seconds, reduce to 5 reps, practice while lying down. Harder: Hold for 10-15 seconds, increase to 15 reps, perform while sitting or standing, add limb movements while bracing. Can progress to dead bug exercise.',
  },
  'Pelvic Tilts': {
    formTips: 'Press lower back flat against floor using core, not leg push. Think of tilting pelvis up toward ceiling. Keep shoulders and upper back relaxed on floor. Breathe normally throughout. Should feel gentle core engagement, not straining.',
    modifications: 'Easier: Tilt only partially, hold 2-3 seconds, reduce to 8 reps. Harder: Hold 8-10 seconds, increase to 15 reps, add simultaneous arm raise, lift one leg while holding tilt. Can progress to bridges when ready.',
  },
  'Bird Dog (Modified)': {
    formTips: 'Keep back flat throughout - no sagging or arching. Extend limbs only to comfortable height. Move slowly and controlled. Balance is key, not height. Keep hips level. Breathe normally. Stop if wrist or knee pain. Can use padding under knees.',
    modifications: 'Easier: Lift only arm or only leg (not both), reduce range, hold 2-3 seconds, reduce to 6 reps. Harder: Extend limbs fully, hold 8-10 seconds, increase to 15 reps, draw knee to elbow between reps. Can add ankle/wrist weights for challenge.',
  },
  'Standing Core Rotation': {
    formTips: 'Keep hips and legs stationary, rotation only through torso. Turn as far as comfortable without forcing. Move smoothly, no jerking. Keep core engaged throughout. Breathe naturally. Should feel gentle stretch in obliques and back.',
    modifications: 'Easier: Rotate only partway, reduce to 8 reps each side, sit if balance is issue. Harder: Hold light weight at chest, increase rotation range, hold 2 seconds at end range, increase to 15 reps. Can add resistance band for more challenge.',
  },
  'Interval Walking': {
    formTips: 'Warm up thoroughly before intervals. Brisk pace should still allow talking but breathlessly. Normal pace should be recovery - true slow-down. Monitor heart rate during brisk intervals - stay in prescribed zone. Stop if chest discomfort or extreme breathlessness. Cool down fully.',
    modifications: 'Easier: Shorten brisk intervals to 1 minute, extend recovery to 4-5 minutes, reduce total duration to 20 minutes. Harder: Extend brisk intervals to 3-5 minutes, reduce recovery to 2 minutes, increase total duration to 40 minutes, add slight inclines. Track and gradually improve work:rest ratio.',
  },
  'Stair Climbing': {
    formTips: 'Always use handrail for safety. Take one step at a time. Push through whole foot, not just toes. Breathe continuously - exhale during climb. Go down slowly - descent requires control. Take breaks as needed. Stop if excessive breathlessness or leg fatigue.',
    modifications: 'Easier: Climb just half flight, rest fully between climbs, hold rail firmly, limit to 5-10 minutes total. Harder: Climb multiple flights, reduce rest time, lighten rail use, increase total time to 20 minutes, carry light load (backpack with water). Never rush on stairs.',
  },
  'Rowing Machine': {
    formTips: 'Sequence: legs push, then lean back, then pull arms. Return: extend arms, lean forward, bend legs. Keep back straight throughout. Don\'t hunch shoulders. Start with very light resistance. Monitor heart rate closely. Stop if lower back pain develops.',
    modifications: 'Easier: Use minimal resistance, limit to 10 minutes, slow stroke rate (15-18 strokes/min), take mid-session break. Harder: Increase resistance, extend to 25-30 minutes, increase rate to 20-24 strokes/min, add intervals. Ensure proper form before increasing intensity.',
  },
  'Lunges (Supported)': {
    formTips: 'Keep torso upright throughout. Front knee stays behind toes. Lower straight down, not forward. Back knee hovers just above floor. Push through front heel to stand. Use support for balance only. Stop if knee pain. Start with short range.',
    modifications: 'Easier: Use firm support, perform partial depth, reduce to 6 reps per leg, step forward shorter distance. Harder: Reduce support, increase depth, increase to 12 reps, hold 2 seconds at bottom, try walking lunges. Can add light weights.',
  },
  'Leg Press (Light Weight)': {
    formTips: 'Keep lower back flat against pad throughout. Place feet hip to shoulder width apart. Push through heels, not toes. Don\'t lock knees at top. Control the weight down - don\'t let it drop. Breathe out during push, in during lowering.',
    modifications: 'Easier: Use minimal weight, reduce range (stop at 90 degrees), reduce to 8 reps, take longer rest. Harder: Gradually increase weight, increase range slightly, increase to 15 reps, slow tempo (3 seconds each way). Can vary foot position for different muscle emphasis.',
  },
  'Push-Ups (Incline)': {
    formTips: 'IMPORTANT: Only after 10+ weeks and complete sternum healing. Body forms straight line. Lower chest toward bench, not hips. Elbows at 45-degree angle. Lower slowly (2-3 seconds). Full arm extension at top. Stop immediately if sternum discomfort.',
    modifications: 'Easier: Use higher incline (counter height), reduce to 5-6 reps, perform on knees, reduce range. Harder: Lower incline (lower bench), increase to 15 reps, add pause at bottom, slow tempo. Eventually progress to floor push-ups.',
  },
  'Dumbbell Chest Press': {
    formTips: 'CRITICAL: Sternum must be completely healed (10+ weeks). Keep feet flat on floor. Lower weights slowly and controlled. Press straight up, not angled. Keep core engaged. Stop immediately if any sternum clicking, pain, or instability. Start very light.',
    modifications: 'Easier: Use 3-5 lbs only, reduce range, perform 6-8 reps, keep elbows higher (less stretch). Harder: Increase to 10-15 lbs, full range, increase to 12 reps, vary tempo, alternate arms. Can perform on stability ball for core challenge.',
  },
  'Tricep Dips (Supported)': {
    formTips: 'Keep shoulders down and back. Lower only a few inches initially. Keep elbows pointing straight back. Core engaged to keep body straight. Push through heels of hands. Stop if shoulder discomfort. This is an advanced exercise.',
    modifications: 'Easier: Bend knees with feet closer, lower only 2-3 inches, reduce to 5 reps, use very stable chair. Harder: Extend legs fully, increase depth, increase to 12 reps, elevate feet on another chair. Can add weight on lap when very strong.',
  },
  'Single Leg Stance': {
    formTips: 'Start with support nearby but try not to use it. Keep core engaged. Focus eyes on fixed point ahead. Distribute weight evenly on standing foot. Keep shoulders and hips level. Breathe normally. Balance improves with practice.',
    modifications: 'Easier: Hold support lightly, balance for just 5-10 seconds, perform near wall. Harder: Remove support completely, increase time to 45-60 seconds, close eyes briefly, stand on unstable surface (pillow). Can add arm movements.',
  },
  'Heel-to-Toe Walk': {
    formTips: 'Walk slowly and deliberately. Keep support nearby but try not to use. Look ahead, not down at feet. Each step should have heel directly against other toes. Arms out to sides for balance if needed. This is challenging - be patient.',
    modifications: 'Easier: Allow small gap between heel and toe, use wall for fingertip support, walk only 5-10 steps. Harder: Walk 20-30 steps, remove support, walk backwards heel-to-toe, walk on line drawn on floor. Can progress to walking on foam.',
  },
  'Standing Knee Raises (Balance)': {
    formTips: 'Use support nearby but try to balance independently. Keep standing leg slightly bent. Lift knee smoothly, don\'t jerk up. Hold steady at top - this is the balance challenge. Keep hips level. Core engaged throughout.',
    modifications: 'Easier: Use light fingertip support, lift knee lower, hold only 2-3 seconds, reduce to 6 reps. Harder: No support, lift knee to hip level, hold 8-10 seconds, increase to 15 reps, close eyes briefly. Can add resistance band for strength.',
  },
  'Side Leg Raises (Balance Challenge)': {
    formTips: 'Stand tall without support. Lift leg directly to side - don\'t lean opposite way. Keep toe pointing forward. Control the lowering. Core and glutes engaged. Small range is fine initially. This is difficult - don\'t get discouraged.',
    modifications: 'Easier: Use light support, lift leg only 6 inches, hold 1-2 seconds, reduce to 6 reps per side. Harder: No support, increase height, hold 5 seconds, increase to 15 reps, perform on unstable surface. Can add ankle weights.',
  },
  'Cat-Cow Stretch': {
    formTips: 'Move slowly through positions. Arch (cat) and extension (cow) should be gentle, not extreme. Coordinate with breath - exhale in cat, inhale in cow. Keep movements smooth and flowing. Use padding under knees if needed. Stop if back pain.',
    modifications: 'Easier: Reduce range of motion, move very slowly, reduce to 5-8 reps. Harder: Hold each position longer, increase to 15 reps, add side bends, coordinate with arm movements. Can perform seated on chair if floor is difficult.',
  },
  'Hamstring Stretch (Seated)': {
    formTips: 'Keep back straight, don\'t round spine. Lean from hips, not waist. You should feel stretch in back of thigh, not lower back. Don\'t bounce. Breathe deeply into stretch. Only stretch to point of mild tension, never pain.',
    modifications: 'Easier: Keep knee slightly bent, lean forward less, hold only 10-15 seconds, use strap around foot. Harder: Straighten leg more, increase forward lean, hold 30-45 seconds, flex foot toward body. Can perform lying down instead.',
  },
  'Quadriceps Stretch (Standing)': {
    formTips: 'Stand tall, don\'t lean forward. Keep knees together. Pull heel gently toward buttocks - don\'t force. Should feel stretch in front of thigh. Keep core engaged. Use support for balance. Stop if knee pain.',
    modifications: 'Easier: Hold support firmly, bend knee less, hold 10-15 seconds, use strap around ankle if can\'t reach. Harder: Release support, increase knee bend, hold 30-45 seconds, pull heel closer. Can perform lying on side.',
  },
  'Hip Flexor Stretch': {
    formTips: 'Keep torso upright and core engaged. Shift weight forward from hips, not by leaning. Back knee should be cushioned. Should feel stretch in front of back hip, not back. Don\'t overarch lower back. Breathe deeply into stretch.',
    modifications: 'Easier: Use more padding under knee, reduce forward shift, hold 15 seconds, keep hands on floor for support. Harder: Lift back arm overhead, increase forward shift, hold 30-45 seconds, add rotation. Can perform standing lunge stretch against wall.',
  },
  'Calf Stretch (Wall)': {
    formTips: 'Keep back heel down firmly - crucial for stretch. Back leg straight with slight knee bend. Front knee bends to shift weight forward. Should feel stretch in calf, not Achilles tendon. Keep toes pointing straight ahead. Don\'t bounce.',
    modifications: 'Easier: Stand closer to wall, reduce forward lean, hold 15 seconds, keep back knee slightly bent. Harder: Step further back, increase forward lean, hold 30-45 seconds, straighten back knee more. Can also stretch with knee bent for soleus muscle.',
  },
  'Chest Doorway Stretch': {
    formTips: 'IMPORTANT: Only after complete sternum healing (8+ weeks). Start very gentle. Place forearms on frame at shoulder height. Step forward slightly - should feel mild stretch across chest. Never force. Stop immediately if any sternum discomfort. Breathe deeply.',
    modifications: 'Easier: Very light stretch only, hold 10-15 seconds, place arms higher (less stretch), step forward less. Harder: Increase forward step, lower arms slightly (more stretch), hold 30 seconds, vary arm height. Can perform with resistance band.',
  },
  'Upper Back Stretch': {
    formTips: 'Round upper back like making a C-shape. Push hands forward to separate shoulder blades. Let head drop naturally. Should feel stretch between shoulder blades. Don\'t force - gentle stretch only. Breathe deeply into back.',
    modifications: 'Easier: Reduce rounding, hold 10 seconds, perform while seated with back support. Harder: Increase rounding, hold 25-30 seconds, pull hands further apart, add gentle side-to-side movement. Can perform standing.',
  },
  'Outdoor Walking': {
    formTips: 'Choose safe, flat routes initially. Wear proper walking shoes. Carry phone for safety. Walk during daylight in well-populated areas. Be aware of weather - avoid extreme heat/cold initially. Start on familiar routes. Monitor how you feel continuously.',
    modifications: 'Easier: Walk 20-25 minutes, choose completely flat route, walk with partner, stay close to home. Harder: Extend to 45-60 minutes, include gentle hills, increase pace, try different terrains. Always tell someone your route and expected return time.',
  },
  'Swimming (Easy Pace)': {
    formTips: 'IMPORTANT: Incision must be completely healed and approved by surgeon. Start in shallow end. Use gentle strokes only. Freestyle and backstroke are easiest. Take frequent breaks at pool edge. Stop if you feel overly fatigued. Never swim alone.',
    modifications: 'Easier: Walk in water instead, use pool buoy for leg support, swim just 5-10 minutes, rest after each lap. Harder: Increase duration to 30 minutes, reduce rest between laps, try different strokes, add water aerobics moves. Always have lifeguard or companion present.',
  },
  'Water Aerobics': {
    formTips: 'Tell instructor about cardiac history. Work at your own pace regardless of class. Water should be chest deep for most moves. Move through water resistance, don\'t fight it. Stay hydrated despite being in water. Never overexert - modify any exercise.',
    modifications: 'Easier: Stay in shallower water, move slower, take frequent breaks, simplify arm movements. Harder: Move to deeper water, increase speed, add water dumbbells, do higher impact moves. Listen to your body above following class.',
  },
  'Group Exercise Class': {
    formTips: 'Inform instructor of cardiac surgery history and limitations. Position yourself near door for exit if needed. Monitor heart rate frequently. Take breaks whenever needed - ignore keeping up with class. Stay within your prescribed heart rate zone. Have water available.',
    modifications: 'Easier: Follow instructor\'s easier modifications, take more frequent breaks, reduce range of motion, slow down pace. Harder: Follow standard moves, add light weights if offered, reduce breaks, increase range. Choose appropriate class level - cardiac rehab or senior fitness best.',
  },
  'Light Jogging Intervals': {
    formTips: 'CRITICAL: Physician approval required. Excellent walking base needed first. Jog very slowly - barely faster than walking. Stay in prescribed heart rate zone. Land mid-foot, not heel. Keep shoulders relaxed. Stop immediately if chest discomfort, unusual breathlessness, or dizziness.',
    modifications: 'Easier: Jog 30 seconds only, walk 5 minutes between, total 20 minutes, jog on flat surface only. Harder: Increase jog to 2 minutes, reduce walk to 3 minutes, extend total time, add gentle hills. Never progress too quickly - this is advanced activity.',
  },
  'Full Squats': {
    formTips: 'Feet shoulder-width, toes slightly out. Descend by pushing hips back (like sitting in chair). Keep chest up and weight in heels. Knees track over toes, don\'t cave in. Squat to thighs parallel only. Drive through heels to stand. Core engaged throughout.',
    modifications: 'Easier: Squat to chair (touch and go), reduce depth to 45 degrees, reduce to 8 reps, hold support. Harder: Increase depth slightly past parallel, increase to 15 reps, slow tempo (3-2-3), add light weight held at chest. Master form before adding weight.',
  },
  'Deadlift (Light Weight)': {
    formTips: 'CRITICAL: Professional instruction recommended. Keep weight close to body. Back flat, never rounded. Lift with legs, not back. Core braced throughout. Look forward, not up or down. Lower weight controlled. Stop if back pain. Start with very light weight (10 lbs max).',
    modifications: 'Easier: Use 5-10 lbs only, reduce to 6-8 reps, elevate weight on box (shorter range), use trap bar if available. Harder: Increase to 15-20 lbs, increase to 12 reps, full range from floor, slow tempo. Never sacrifice form for weight.',
  },
  'Push-Ups (Standard)': {
    formTips: 'CRITICAL: Only after 11+ weeks and complete sternum healing. Body forms straight line head to heels. Hands under shoulders. Lower chest to 2-3 inches from floor. Elbows at 45 degrees. Core tight. Stop immediately if any sternum symptoms. Start conservatively.',
    modifications: 'Easier: Perform on knees, reduce range, reduce to 5-6 reps, incline hands on step. Harder: Full range to floor, increase to 15 reps, slow tempo, pause at bottom, elevate feet. This is an achievement milestone - don\'t rush it.',
  },
  'Pull-Ups (Assisted)': {
    formTips: 'Use assistance machine set appropriately. Grip bar firmly. Pull with back muscles, not just arms. Bring chin over bar. Lower with control. Core engaged. This is very advanced - most people need significant assistance initially. No shame in that.',
    modifications: 'Easier: Use maximum assistance, perform partial range, reduce to 3-4 reps, use band assistance. Harder: Reduce assistance gradually, increase range, increase to 8-10 reps, slow tempo. Can substitute lat pulldowns initially. This may take months to achieve.',
  },
  'Plank': {
    formTips: 'Body forms straight line from head to heels. Elbows under shoulders. Core and glutes engaged. Look down, keep neck neutral. Don\'t hold breath - breathe normally. Stop if back sags or trembling becomes excessive. Quality over duration.',
    modifications: 'Easier: Perform on knees, hold 10-15 seconds only, incline on bench. Harder: Hold 45-60 seconds, lift one leg, lift one arm, perform on unstable surface. Build duration gradually - add 5 seconds per week.',
  },
  'Side Plank': {
    formTips: 'Stack feet or stagger for easier balance. Keep body straight - hips shouldn\'t sag. Bottom elbow directly under shoulder. Core and obliques engaged. Breathe normally. This is advanced - start with very short holds.',
    modifications: 'Easier: Keep bottom knee on ground, hold 10-15 seconds, perform against wall. Harder: Stack feet, hold 30-45 seconds, lift top leg, lift top arm, add hip dips. Progress gradually.',
  },
  'Mountain Climbers (Slow)': {
    formTips: 'Start in solid plank position. Bring knee toward chest smoothly. Core engaged throughout. Hips stay level - don\'t pike up. Move with control, not speed. Breathe continuously. This is advanced exercise with cardio component.',
    modifications: 'Easier: Step feet in slowly (not driving), reduce to 10 reps, elevate hands on bench, keep hands on ground and slide feet. Harder: Increase speed slightly, increase to 30 reps, bring knee to opposite elbow, add push-up between reps. Never sacrifice form.',
  },
  'Single Leg Deadlift': {
    formTips: 'Keep standing leg slightly bent. Hinge from hip, not waist. Reach toward floor while extending back leg. Keep back flat. Core engaged for balance. This is very challenging - use support initially. Stop if balance is poor or back pain.',
    modifications: 'Easier: Use support, don\'t lower far, touch down with back toe, reduce to 5-6 reps. Harder: No support, increase range, hold weight in hands, hold at bottom 2 seconds. Can perform on unstable surface when proficient.',
  },
  'Bosu Ball Squats': {
    formTips: 'Step onto Bosu carefully. Find balance before squatting. Squat depth reduced due to instability. Keep core extra tight. Use arms for balance. Keep weight in heels. This is very advanced - master regular squats first.',
    modifications: 'Easier: Use support nearby, squat just few inches, reduce to 6-8 reps, use flatter side of Bosu up. Harder: No support, increase depth, increase to 15 reps, add light weight, close eyes briefly. Progress gradually.',
  },
  'Carrying Objects (Farmer\'s Walk)': {
    formTips: 'Hold weights at sides with straight arms. Walk with good posture - chest up, shoulders back. Take normal stride. Core engaged. Walk in straight line. Start with light weight. Stop if grip failing or balance compromised.',
    modifications: 'Easier: Use 5-10 lbs per hand, walk just 20 feet, take breaks, walk slowly. Harder: Increase to 15-25 lbs, walk 50 feet+, increase pace, use one hand only (suitcase carry). This is highly functional exercise.',
  },
  'Reaching and Lifting Practice': {
    formTips: 'Start with very light object (1 lb). Reach overhead with control. Keep core engaged. Lower slowly. Squat down to pick up from floor - don\'t bend at waist. This practices daily activities. Stop if shoulder or back discomfort.',
    modifications: 'Easier: Use lighter object, don\'t reach as high, reduce reps, stay seated. Harder: Use 3-5 lb object, reach higher, add squatting component, increase reps. Practice functional patterns you need in daily life.',
  },
  'Stair Step Patterns': {
    formTips: 'Always use handrail. Take time with each pattern. Step fully onto step. Lower slowly. Stop if you feel unsteady or fatigued. This is advanced - requires good fitness base. Never rush.',
    modifications: 'Easier: Single step pattern only, hold rail firmly, reduce reps, take longer breaks. Harder: Try two steps at a time, side steps, cross-over steps, reduce rail use. Build confidence gradually.',
  },
  'Agility Ladder Drills': {
    formTips: 'Start slowly - this isn\'t about speed initially. Watch foot placement. Stay light on feet. Keep core engaged. Breathe continuously. Stop if you feel unsteady. This improves coordination. Focus on pattern accuracy before speed.',
    modifications: 'Easier: Simple pattern (one foot each square), move slowly, reduce time, walk through pattern first. Harder: Complex patterns (both feet each, lateral, hop), increase speed, extend duration, add direction changes. Make it fun.',
  },
};

const filePath = path.join(__dirname, 'seedExercises.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

console.log(`Found ${Object.keys(exerciseTips).length} exercises with tips to add`);
console.log('\nNote: This script contains all the tips but requires manual integration');
console.log('since the file structure is complex. You\'ll need to copy the tips');
console.log('from the exerciseTips object above and add them to the corresponding');
console.log('exercises in seedExercises.ts\n');
