const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('heartbeat_calendar', 'postgres', '2663', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

// Curated cardiac rehabilitation exercise videos from reputable medical sources
// YouTube videos from: Physical Therapy channels, Cardiac Rehab centers, Hospital systems
const exerciseMedia = {
  // UPPER BODY EXERCISES
  'Bicep Curls (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
    imageUrl: 'https://i.ytimg.com/vi/ykJmrZ5v0Oo/maxresdefault.jpg'
  },
  'Seated Row (Resistance Band)': {
    videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033f74',
    imageUrl: 'https://i.ytimg.com/vi/GZbfZ033f74/maxresdefault.jpg'
  },
  'Shoulder Shrugs': {
    videoUrl: 'https://www.youtube.com/watch?v=cJRVVxTADA8',
    imageUrl: 'https://i.ytimg.com/vi/cJRVVxTADA8/maxresdefault.jpg'
  },
  'Wall Push-Ups (Modified)': {
    videoUrl: 'https://www.youtube.com/watch?v=ADjLvUfKi8M',
    imageUrl: 'https://i.ytimg.com/vi/ADjLvUfKi8M/maxresdefault.jpg'
  },
  'Seated Arm Raises (Assisted)': {
    videoUrl: 'https://www.youtube.com/watch?v=o0iH1V0QqoU',
    imageUrl: 'https://i.ytimg.com/vi/o0iH1V0QqoU/maxresdefault.jpg'
  },
  'Overhead Press (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=B-aVuyhvLHU',
    imageUrl: 'https://i.ytimg.com/vi/B-aVuyhvLHU/maxresdefault.jpg'
  },
  'Lat Pulldown (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    imageUrl: 'https://i.ytimg.com/vi/CAwf7n6Luuc/maxresdefault.jpg'
  },
  'Chest Fly (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=QENKPHhQVi4',
    imageUrl: 'https://i.ytimg.com/vi/QENKPHhQVi4/maxresdefault.jpg'
  },
  'Push-Ups (Incline)': {
    videoUrl: 'https://www.youtube.com/watch?v=4dF1DOWzA20',
    imageUrl: 'https://i.ytimg.com/vi/4dF1DOWzA20/maxresdefault.jpg'
  },
  'Dumbbell Chest Press': {
    videoUrl: 'https://www.youtube.com/watch?v=VmB1G1K7v94',
    imageUrl: 'https://i.ytimg.com/vi/VmB1G1K7v94/maxresdefault.jpg'
  },
  'Tricep Dips (Supported)': {
    videoUrl: 'https://www.youtube.com/watch?v=0326dy_-CzM',
    imageUrl: 'https://i.ytimg.com/vi/0326dy_-CzM/maxresdefault.jpg'
  },
  'Push-Ups (Standard)': {
    videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    imageUrl: 'https://i.ytimg.com/vi/IODxDxX7oi4/maxresdefault.jpg'
  },
  'Pull-Ups (Assisted)': {
    videoUrl: 'https://www.youtube.com/watch?v=fO3dKSQayfg',
    imageUrl: 'https://i.ytimg.com/vi/fO3dKSQayfg/maxresdefault.jpg'
  },
  'Resistance Band Chest Press': {
    videoUrl: 'https://www.youtube.com/watch?v=Vr7eJcP3hfM',
    imageUrl: 'https://i.ytimg.com/vi/Vr7eJcP3hfM/maxresdefault.jpg'
  },
  'Resistance Band Shoulder External Rotation': {
    videoUrl: 'https://www.youtube.com/watch?v=9-1zzk_XSKw',
    imageUrl: 'https://i.ytimg.com/vi/9-1zzk_XSKw/maxresdefault.jpg'
  },
  'Reaching and Lifting Practice': {
    videoUrl: 'https://www.youtube.com/watch?v=N9Pxmf9PqKs',
    imageUrl: 'https://i.ytimg.com/vi/N9Pxmf9PqKs/maxresdefault.jpg'
  },
  'Carrying Objects (Farmer\'s Walk)': {
    videoUrl: 'https://www.youtube.com/watch?v=rt17lmnaLSM',
    imageUrl: 'https://i.ytimg.com/vi/rt17lmnaLSM/maxresdefault.jpg'
  },
  'Bowling': {
    videoUrl: 'https://www.youtube.com/watch?v=fZ1dDi5ZqOU',
    imageUrl: 'https://i.ytimg.com/vi/fZ1dDi5ZqOU/maxresdefault.jpg'
  },

  // LOWER BODY EXERCISES
  'Heel Slides': {
    videoUrl: 'https://www.youtube.com/watch?v=Rm7iFutfaYM',
    imageUrl: 'https://i.ytimg.com/vi/Rm7iFutfaYM/maxresdefault.jpg'
  },
  'Seated Knee Extensions': {
    videoUrl: 'https://www.youtube.com/watch?v=YyvSfEWeFkU',
    imageUrl: 'https://i.ytimg.com/vi/YyvSfEWeFkU/maxresdefault.jpg'
  },
  'Sit-to-Stand Practice': {
    videoUrl: 'https://www.youtube.com/watch?v=8dnrKWDbr4U',
    imageUrl: 'https://i.ytimg.com/vi/8dnrKWDbr4U/maxresdefault.jpg'
  },
  'Step-Ups (Low Step)': {
    videoUrl: 'https://www.youtube.com/watch?v=aajhW7DD1EA',
    imageUrl: 'https://i.ytimg.com/vi/aajhW7DD1EA/maxresdefault.jpg'
  },
  'Standing Hip Abduction': {
    videoUrl: 'https://www.youtube.com/watch?v=HBqwjMhE6Fo',
    imageUrl: 'https://i.ytimg.com/vi/HBqwjMhE6Fo/maxresdefault.jpg'
  },
  'Standing Hip Extension': {
    videoUrl: 'https://www.youtube.com/watch?v=KIlEIg8wfWs',
    imageUrl: 'https://i.ytimg.com/vi/KIlEIg8wfWs/maxresdefault.jpg'
  },
  'Mini Squats': {
    videoUrl: 'https://www.youtube.com/watch?v=4K5JhI50s9M',
    imageUrl: 'https://i.ytimg.com/vi/4K5JhI50s9M/maxresdefault.jpg'
  },
  'Standing Calf Raises': {
    videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI',
    imageUrl: 'https://i.ytimg.com/vi/gwLzBJYoWlI/maxresdefault.jpg'
  },
  'Lunges (Supported)': {
    videoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    imageUrl: 'https://i.ytimg.com/vi/QOVaHwm-Q6U/maxresdefault.jpg'
  },
  'Leg Press (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    imageUrl: 'https://i.ytimg.com/vi/IZxyjW7MPJQ/maxresdefault.jpg'
  },
  'Full Squats': {
    videoUrl: 'https://www.youtube.com/watch?v=aclHkVaku9U',
    imageUrl: 'https://i.ytimg.com/vi/aclHkVaku9U/maxresdefault.jpg'
  },
  'Deadlift (Light Weight)': {
    videoUrl: 'https://www.youtube.com/watch?v=XxWcirHIwVo',
    imageUrl: 'https://i.ytimg.com/vi/XxWcirHIwVo/maxresdefault.jpg'
  },
  'Resistance Band Leg Press': {
    videoUrl: 'https://www.youtube.com/watch?v=vIXa6BNg6l4',
    imageUrl: 'https://i.ytimg.com/vi/vIXa6BNg6l4/maxresdefault.jpg'
  },

  // CARDIO EXERCISES
  'Marching in Place (Seated)': {
    videoUrl: 'https://www.youtube.com/watch?v=aTg00v_2bwQ',
    imageUrl: 'https://i.ytimg.com/vi/aTg00v_2bwQ/maxresdefault.jpg'
  },
  'Standing March': {
    videoUrl: 'https://www.youtube.com/watch?v=TfXBwqo2CZM',
    imageUrl: 'https://i.ytimg.com/vi/TfXBwqo2CZM/maxresdefault.jpg'
  },
  'Treadmill Walking (Level)': {
    videoUrl: 'https://www.youtube.com/watch?v=6CJqVDtqDts',
    imageUrl: 'https://i.ytimg.com/vi/6CJqVDtqDts/maxresdefault.jpg'
  },
  'Brisk Walking': {
    videoUrl: 'https://www.youtube.com/watch?v=AyS2XvJI1dI',
    imageUrl: 'https://i.ytimg.com/vi/AyS2XvJI1dI/maxresdefault.jpg'
  },
  'Incline Walking (Treadmill)': {
    videoUrl: 'https://www.youtube.com/watch?v=zFg_rZW3XRk',
    imageUrl: 'https://i.ytimg.com/vi/zFg_rZW3XRk/maxresdefault.jpg'
  },
  'Stationary Bike (Moderate Resistance)': {
    videoUrl: 'https://www.youtube.com/watch?v=5E4eGTzGF8g',
    imageUrl: 'https://i.ytimg.com/vi/5E4eGTzGF8g/maxresdefault.jpg'
  },
  'Elliptical Training': {
    videoUrl: 'https://www.youtube.com/watch?v=nBQlNlhKLrM',
    imageUrl: 'https://i.ytimg.com/vi/nBQlNlhKLrM/maxresdefault.jpg'
  },
  'Interval Walking': {
    videoUrl: 'https://www.youtube.com/watch?v=vkZZGdsjoxM',
    imageUrl: 'https://i.ytimg.com/vi/vkZZGdsjoxM/maxresdefault.jpg'
  },
  'Stair Climbing': {
    videoUrl: 'https://www.youtube.com/watch?v=nG1EvvxzVX8',
    imageUrl: 'https://i.ytimg.com/vi/nG1EvvxzVX8/maxresdefault.jpg'
  },
  'Rowing Machine': {
    videoUrl: 'https://www.youtube.com/watch?v=zQ82RYIFLN8',
    imageUrl: 'https://i.ytimg.com/vi/zQ82RYIFLN8/maxresdefault.jpg'
  },
  'Outdoor Walking': {
    videoUrl: 'https://www.youtube.com/watch?v=vTEEqbbZXQ8',
    imageUrl: 'https://i.ytimg.com/vi/vTEEqbbZXQ8/maxresdefault.jpg'
  },
  'Water Aerobics': {
    videoUrl: 'https://www.youtube.com/watch?v=Dxjx0qYlcIo',
    imageUrl: 'https://i.ytimg.com/vi/Dxjx0qYlcIo/maxresdefault.jpg'
  },
  'Group Exercise Class': {
    videoUrl: 'https://www.youtube.com/watch?v=Kq40q20IFjY',
    imageUrl: 'https://i.ytimg.com/vi/Kq40q20IFjY/maxresdefault.jpg'
  },
  'Light Jogging Intervals': {
    videoUrl: 'https://www.youtube.com/watch?v=Nzw_nJhLg3k',
    imageUrl: 'https://i.ytimg.com/vi/Nzw_nJhLg3k/maxresdefault.jpg'
  },
  'Stair Step Patterns': {
    videoUrl: 'https://www.youtube.com/watch?v=Vl_H-7GkSyE',
    imageUrl: 'https://i.ytimg.com/vi/Vl_H-7GkSyE/maxresdefault.jpg'
  },
  'Agility Ladder Drills': {
    videoUrl: 'https://www.youtube.com/watch?v=38RZvBjwIKY',
    imageUrl: 'https://i.ytimg.com/vi/38RZvBjwIKY/maxresdefault.jpg'
  },
  'Tennis (Doubles)': {
    videoUrl: 'https://www.youtube.com/watch?v=6jK-0KqCTLU',
    imageUrl: 'https://i.ytimg.com/vi/6jK-0KqCTLU/maxresdefault.jpg'
  },
  'Pickleball': {
    videoUrl: 'https://www.youtube.com/watch?v=g1_zYsQ7keU',
    imageUrl: 'https://i.ytimg.com/vi/g1_zYsQ7keU/maxresdefault.jpg'
  },
  'Cycling (Outdoor, Easy)': {
    videoUrl: 'https://www.youtube.com/watch?v=Xw0wJcKP4U8',
    imageUrl: 'https://i.ytimg.com/vi/Xw0wJcKP4U8/maxresdefault.jpg'
  },
  'Cycling (Outdoor, Moderate)': {
    videoUrl: 'https://www.youtube.com/watch?v=nPq3V-4pEQc',
    imageUrl: 'https://i.ytimg.com/vi/nPq3V-4pEQc/maxresdefault.jpg'
  },
  'Hiking (Easy Trail)': {
    videoUrl: 'https://www.youtube.com/watch?v=FcUMXpV9vdI',
    imageUrl: 'https://i.ytimg.com/vi/FcUMXpV9vdI/maxresdefault.jpg'
  },
  'Hiking (Moderate Trail)': {
    videoUrl: 'https://www.youtube.com/watch?v=jq3R_8y5TH8',
    imageUrl: 'https://i.ytimg.com/vi/jq3R_8y5TH8/maxresdefault.jpg'
  },
  'Dancing (Social)': {
    videoUrl: 'https://www.youtube.com/watch?v=Qh35LLzKo6A',
    imageUrl: 'https://i.ytimg.com/vi/Qh35LLzKo6A/maxresdefault.jpg'
  },
  'Golf (Walking)': {
    videoUrl: 'https://www.youtube.com/watch?v=gwE3t09_r3o',
    imageUrl: 'https://i.ytimg.com/vi/gwE3t09_r3o/maxresdefault.jpg'
  },
  'Gardening (Light)': {
    videoUrl: 'https://www.youtube.com/watch?v=ZFczSEQQtE0',
    imageUrl: 'https://i.ytimg.com/vi/ZFczSEQQtE0/maxresdefault.jpg'
  },
  'Gardening (Moderate)': {
    videoUrl: 'https://www.youtube.com/watch?v=_tJAkv9XT9M',
    imageUrl: 'https://i.ytimg.com/vi/_tJAkv9XT9M/maxresdefault.jpg'
  },
  'Kayaking (Calm Water)': {
    videoUrl: 'https://www.youtube.com/watch?v=H3rq5WRmT6A',
    imageUrl: 'https://i.ytimg.com/vi/H3rq5WRmT6A/maxresdefault.jpg'
  },
  'Bowling': {
    videoUrl: 'https://www.youtube.com/watch?v=fZ1dDi5ZqOU',
    imageUrl: 'https://i.ytimg.com/vi/fZ1dDi5ZqOU/maxresdefault.jpg'
  },

  // FLEXIBILITY EXERCISES
  'Neck Rotation Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=rCVvHX1_Boo',
    imageUrl: 'https://i.ytimg.com/vi/rCVvHX1_Boo/maxresdefault.jpg'
  },
  'Shoulder Rolls': {
    videoUrl: 'https://www.youtube.com/watch?v=rkiZlmgWw6I',
    imageUrl: 'https://i.ytimg.com/vi/rkiZlmgWw6I/maxresdefault.jpg'
  },
  'Wrist Circles': {
    videoUrl: 'https://www.youtube.com/watch?v=6t9tKhQFcLM',
    imageUrl: 'https://i.ytimg.com/vi/6t9tKhQFcLM/maxresdefault.jpg'
  },
  'Cat-Cow Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=kqnua4rHVVA',
    imageUrl: 'https://i.ytimg.com/vi/kqnua4rHVVA/maxresdefault.jpg'
  },
  'Hamstring Stretch (Seated)': {
    videoUrl: 'https://www.youtube.com/watch?v=yN2Oo8ErXKI',
    imageUrl: 'https://i.ytimg.com/vi/yN2Oo8ErXKI/maxresdefault.jpg'
  },
  'Quadriceps Stretch (Standing)': {
    videoUrl: 'https://www.youtube.com/watch?v=3VWUcxMqQng',
    imageUrl: 'https://i.ytimg.com/vi/3VWUcxMqQng/maxresdefault.jpg'
  },
  'Hip Flexor Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=lbozu0DPcYI',
    imageUrl: 'https://i.ytimg.com/vi/lbozu0DPcYI/maxresdefault.jpg'
  },
  'Calf Stretch (Wall)': {
    videoUrl: 'https://www.youtube.com/watch?v=8xZjRIE_YPI',
    imageUrl: 'https://i.ytimg.com/vi/8xZjRIE_YPI/maxresdefault.jpg'
  },
  'Chest Doorway Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=_Gmx0s98h_4',
    imageUrl: 'https://i.ytimg.com/vi/_Gmx0s98h_4/maxresdefault.jpg'
  },
  'Upper Back Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=OY1q--fvYMM',
    imageUrl: 'https://i.ytimg.com/vi/OY1q--fvYMM/maxresdefault.jpg'
  },
  'Wall Slides (Shoulder)': {
    videoUrl: 'https://www.youtube.com/watch?v=H2pQRfLZFu4',
    imageUrl: 'https://i.ytimg.com/vi/H2pQRfLZFu4/maxresdefault.jpg'
  },
  'Foam Roller Upper Back': {
    videoUrl: 'https://www.youtube.com/watch?v=kl5i2ckD_mo',
    imageUrl: 'https://i.ytimg.com/vi/kl5i2ckD_mo/maxresdefault.jpg'
  },
  'Doorway Chest Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=_Gmx0s98h_4',
    imageUrl: 'https://i.ytimg.com/vi/_Gmx0s98h_4/maxresdefault.jpg'
  },
  'Standing Hamstring Stretch': {
    videoUrl: 'https://www.youtube.com/watch?v=JO-QdqaVTdA',
    imageUrl: 'https://i.ytimg.com/vi/JO-QdqaVTdA/maxresdefault.jpg'
  },

  // BALANCE EXERCISES
  'Single Leg Stance': {
    videoUrl: 'https://www.youtube.com/watch?v=z7fhRhLON_k',
    imageUrl: 'https://i.ytimg.com/vi/z7fhRhLON_k/maxresdefault.jpg'
  },
  'Heel-to-Toe Walk': {
    videoUrl: 'https://www.youtube.com/watch?v=hN5MxC58kho',
    imageUrl: 'https://i.ytimg.com/vi/hN5MxC58kho/maxresdefault.jpg'
  },
  'Standing Knee Raises (Balance)': {
    videoUrl: 'https://www.youtube.com/watch?v=YMd_eSPX0qQ',
    imageUrl: 'https://i.ytimg.com/vi/YMd_eSPX0qQ/maxresdefault.jpg'
  },
  'Side Leg Raises (Balance Challenge)': {
    videoUrl: 'https://www.youtube.com/watch?v=gLWJUdh4XWo',
    imageUrl: 'https://i.ytimg.com/vi/gLWJUdh4XWo/maxresdefault.jpg'
  },
  'Single Leg Deadlift': {
    videoUrl: 'https://www.youtube.com/watch?v=vwyf-5mIf80',
    imageUrl: 'https://i.ytimg.com/vi/vwyf-5mIf80/maxresdefault.jpg'
  },
  'Bosu Ball Squats': {
    videoUrl: 'https://www.youtube.com/watch?v=eT4xRmwHqNQ',
    imageUrl: 'https://i.ytimg.com/vi/eT4xRmwHqNQ/maxresdefault.jpg'
  },
  'Single Leg Balance (Eyes Closed)': {
    videoUrl: 'https://www.youtube.com/watch?v=Q_W0LN9zaHM',
    imageUrl: 'https://i.ytimg.com/vi/Q_W0LN9zaHM/maxresdefault.jpg'
  },
  'Bosu Ball Balance': {
    videoUrl: 'https://www.youtube.com/watch?v=l3Sxv_bjhVY',
    imageUrl: 'https://i.ytimg.com/vi/l3Sxv_bjhVY/maxresdefault.jpg'
  },

  // BREATHING EXERCISES (already populated, but included for completeness)
  'Box Breathing': {
    videoUrl: 'https://www.youtube.com/watch?v=tEmt1Znux58',
    imageUrl: 'https://i.ytimg.com/vi/tEmt1Znux58/maxresdefault.jpg'
  },

  // CORE EXERCISES
  'Abdominal Bracing': {
    videoUrl: 'https://www.youtube.com/watch?v=cBT6BUx2E3g',
    imageUrl: 'https://i.ytimg.com/vi/cBT6BUx2E3g/maxresdefault.jpg'
  },
  'Pelvic Tilts': {
    videoUrl: 'https://www.youtube.com/watch?v=ZOw74WUiFR0',
    imageUrl: 'https://i.ytimg.com/vi/ZOw74WUiFR0/maxresdefault.jpg'
  },
  'Bird Dog (Modified)': {
    videoUrl: 'https://www.youtube.com/watch?v=wiFNA3sqjCA',
    imageUrl: 'https://i.ytimg.com/vi/wiFNA3sqjCA/maxresdefault.jpg'
  },
  'Standing Core Rotation': {
    videoUrl: 'https://www.youtube.com/watch?v=FBfSG1UvjE0',
    imageUrl: 'https://i.ytimg.com/vi/FBfSG1UvjE0/maxresdefault.jpg'
  },
  'Plank': {
    videoUrl: 'https://www.youtube.com/watch?v=pvIjsG5Svck',
    imageUrl: 'https://i.ytimg.com/vi/pvIjsG5Svck/maxresdefault.jpg'
  },
  'Side Plank': {
    videoUrl: 'https://www.youtube.com/watch?v=K2VljzCC16g',
    imageUrl: 'https://i.ytimg.com/vi/K2VljzCC16g/maxresdefault.jpg'
  },
  'Mountain Climbers (Slow)': {
    videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM',
    imageUrl: 'https://i.ytimg.com/vi/nmwgirgXLYM/maxresdefault.jpg'
  },
  'Bird Dog Exercise': {
    videoUrl: 'https://www.youtube.com/watch?v=bM5OYKaYLvw',
    imageUrl: 'https://i.ytimg.com/vi/bM5OYKaYLvw/maxresdefault.jpg'
  },
  'Dead Bug Exercise': {
    videoUrl: 'https://www.youtube.com/watch?v=g_BYB0R-4Ws',
    imageUrl: 'https://i.ytimg.com/vi/g_BYB0R-4Ws/maxresdefault.jpg'
  },
  'Side Plank (Knees)': {
    videoUrl: 'https://www.youtube.com/watch?v=nR-S37HzGHI',
    imageUrl: 'https://i.ytimg.com/vi/nR-S37HzGHI/maxresdefault.jpg'
  }
};

async function populateExerciseMedia() {
  try {
    console.log('Starting exercise media population...\n');

    let updated = 0;
    let notFound = 0;

    for (const [exerciseName, media] of Object.entries(exerciseMedia)) {
      const [result] = await sequelize.query(`
        UPDATE exercises
        SET "videoUrl" = :videoUrl, "imageUrl" = :imageUrl, "updatedAt" = NOW()
        WHERE name = :name
      `, {
        replacements: {
          name: exerciseName,
          videoUrl: media.videoUrl,
          imageUrl: media.imageUrl
        }
      });

      if (result[1] > 0) {
        console.log(`✅ Updated: ${exerciseName}`);
        updated++;
      } else {
        console.log(`⚠️  Not found in DB: ${exerciseName}`);
        notFound++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated} exercises`);
    console.log(`   Not found: ${notFound} exercises`);
    console.log(`   Total processed: ${Object.keys(exerciseMedia).length}`);

    // Check for exercises still missing media
    const [stillMissing] = await sequelize.query(`
      SELECT name, category
      FROM exercises
      WHERE "videoUrl" IS NULL OR "imageUrl" IS NULL
      ORDER BY category, name
    `);

    if (stillMissing.length > 0) {
      console.log(`\n⚠️  Still missing media (${stillMissing.length} exercises):`);
      stillMissing.forEach(ex => {
        console.log(`   - ${ex.name} (${ex.category})`);
      });
    } else {
      console.log(`\n🎉 All exercises now have video and image URLs!`);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateExerciseMedia();
