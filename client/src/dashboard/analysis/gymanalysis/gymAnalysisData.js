import { computeGymAnalysis, GYM_ANALYSIS_NOTE } from "../../../../../shared/gymAnalysisStats.js";
export function demoGymAnalysis(year, month) {
  const exercises = [], measurements = [];
  for (const m of ["02","03","04"]) {
    const offset = Number(m)-2;
    for (const d of ["02","05","09","12","16","19","23","26"]) for (const [id,name,group,load] of [
      ["press","Bench Press","Chest",40],["squat","Squat","Legs",60],["run","Easy Run","Cardio",null]]) {
      exercises.push({ exerciseId:id,exerciseName:name,bodyPart:group,date:"2026-"+m+"-"+d,
        sets:load === null ? "" : "3",reps:load === null ? "" : "10",weight:load === null ? "" : String(load+offset*5+Number(d)/2),
        totalTime:load === null ? "20" : "12" });
    }
    for (const d of ["03","17","27"]) measurements.push({checkInDate:"2026-"+m+"-"+d,
      bodyWeight:String(78-offset-Number(d)/30),waist:String(86-offset-Number(d)/30),chest:String(96+offset)});
  }
  const macroPlans = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,index)=>({
    day,planType:"macros",isActive:true,values:{protein:String(120+index*5),carbs:"220",fats:"60",calories:"2000",fiber:"25",water:"2.5",sugar:"0",sodium:"1800"},
  }));
  return {year:Number(year),month:Number(month),today:"2026-10-10",timezone:"Asia/Kolkata",serverNow:"2026-10-10T06:00:00Z",
    joinedDay:"2026-02-01",analysis:computeGymAnalysis({exercises,measurements,macroPlans},{year,month,today:"2026-10-10"}),dataNote:GYM_ANALYSIS_NOTE};
}

