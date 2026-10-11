import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import GymDietPlan from "../models/GymDietPlan.js";
import GymMeasurement from "../models/GymMeasurement.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import { getWorkoutPlans, getGymDietPlans, getMeasurements, getGymGalleryEntries, getGymCustomExercises, getExerciseProgress, getWorkoutPlanLogs, getGymHeatmap, createWorkoutPlan, updateWorkoutPlan, toggleWorkoutPlanActive, deleteWorkoutPlan, updateGymDietPlan, toggleGymDietPlanActive, deleteGymDietPlan, createGymDietPlan, updateMeasurement, deleteMeasurement, undoDeleteMeasurement, upsertExerciseProgress } from "../controllers/gymController.js";
import { checkGymRevision, saveGymRecord } from "../utils/gymMutationUtils.js";
import { validGymResponse, validWorkoutPlan, validWorkoutPlans, validDietPlans, validMeasurements, validLibrary, validGallery, validProgressMap, validPlanLogs, validGymClock, gymFailureMessage, measurementKeys } from "../../client/src/dashboard/gym/gymResponse.js";

const USER="000000000000000000000001", ID="000000000000000000000002", NOW="2026-10-11T06:00:00.000Z", DAY="2026-10-11";
const plan = extra => ({id:ID,title:"Strength",goalType:"strength",workoutSplit:"full-body",totalEstimatedTime:"30",difficulty:"Beginner",days:["Sun"],startDate:DAY,neverEnds:true,endDate:"",isActive:false,exercises:[{id:"bench",name:"Bench",bodyPart:"Chest",sets:"3",reps:"10",weight:"20",duration:"10",restTime:"60"}],createdAt:NOW,updatedAt:NOW,...extra});
const diet = extra => ({id:ID,planType:"macros",day:"Sun",isActive:false,values:Object.fromEntries(["protein","carbs","fats","fiber","calories","water","sugar","sodium"].map(key=>[key,""])),updatedAt:NOW,...extra});
const measure = extra => ({id:ID,checkInDate:DAY,...Object.fromEntries(measurementKeys.map(key=>[key,""])),bodyWeight:"80",updatedAt:NOW,deletedAt:null,canUndoDelete:false,deleteUndoExpiresAt:null,deleteUndoRemainingMs:0,...extra});
const progress = extra => ({id:ID,date:DAY,exerciseId:"bench",exerciseName:"Bench",bodyPart:"Chest",sets:"3",reps:"10",weight:"20",lastSetReps:"",lastSetWeight:"",totalTime:"10",restBetweenSets:"60",notes:"",repsBreakdown:[],savedAt:NOW,...extra});
const req = body => ({user:{id:USER},params:{id:ID},query:{},body:body||{}});
const freeze = t => t.mock.timers.enable({apis:["Date"],now:Date.parse(NOW)});
async function call(handler,request=req()){let status=200,body;await handler(request,{status(n){status=n;return this},json(value){body=JSON.parse(JSON.stringify(value));return this}});return{status,body}}
function transaction(t,Model,record){const session={fixture:true};t.mock.method(mongoose.connection,"transaction",task=>task(session));t.mock.method(User,"updateOne",async(filter,update,options)=>{assert.equal(filter._id,USER);assert.equal(options.session,session);return{matchedCount:1}});t.mock.method(Model,"findOne",filter=>{assert.equal(filter.userId,USER);return{session(s){assert.equal(s,session);return Promise.resolve(record)}}});return session}

test("Gym response contracts validate empty snapshots and reject nested render objects",()=>{
 for(const valid of[validWorkoutPlans,validDietPlans,validMeasurements,validLibrary,validGallery,validPlanLogs])assert.equal(valid([]),true);
 assert.equal(validProgressMap({}),true);assert.equal(validWorkoutPlan(plan()),true);
 for(const row of[plan({title:{}}),plan({days:[{}]}),plan({exercises:[{id:"x",name:"Press",bodyPart:{}}]}),plan({exercises:[{id:"x",name:"Press",sets:{}}]})])assert.equal(validWorkoutPlans([row]),false);
 assert.equal(validWorkoutPlans([plan(),plan()]),false);
 assert.equal(validDietPlans([diet({values:{calories:{}}})]),false);
 assert.equal(validMeasurements([measure({bodyWeight:{}})]),false);
 assert.equal(validProgressMap({[`${DAY}_bench`]:progress({notes:{}})}),false);
 assert.equal(validProgressMap({wrong:progress()}),false);
 assert.equal(validGallery([{id:ID,date:DAY,images:[{id:"x",src:"javascript:alert(1)"}]}]),false);
 assert.equal(validLibrary([{id:ID,name:{},bodyGroup:"Chest",bodySection:"",bodyPart:"Chest",custom:true}]),false);
 assert.equal(gymFailureMessage({response:{data:{message:{}}}},"Safe"),"Safe");
});
test("Gym clock rejects invalid zones and mismatched app calendar days",()=>{
 const clock={date:DAY,day:"Sun",timezone:"Asia/Kolkata",serverNow:NOW};assert.equal(validGymClock(clock),true);
 for(const extra of[{timezone:{}},{timezone:"invalid/zone"},{date:"2026-10-10"},{day:"Mon"},{serverNow:{}}])assert.equal(validGymClock({...clock,...extra}),false);
});
test("Gym confirmations match records, requested state and exact nested fields",()=>{
 assert.equal(validGymResponse(`/gym/plans/${ID}`,"patch",plan(),{title:"Strength"}),true);
 assert.equal(validGymResponse(`/gym/plans/${USER}`,"patch",plan(),{}),false);
 assert.equal(validGymResponse(`/gym/plans/${ID}/active`,"patch",[plan()],{isActive:true}),false);
 assert.equal(validGymResponse(`/gym/plans/${ID}`,"delete",{message:"ok"}),false);
 assert.equal(validGymResponse(`/gym/plans/${ID}`,"delete",{message:"ok",deletedId:ID}),true);
 assert.equal(validGymResponse(`/gym/diet-plans/${ID}`,"patch",diet(),{values:{calories:"2000"}}),false);
 assert.equal(validGymResponse(`/gym/measurements/${ID}`,"patch",measure(),{bodyWeight:"81"}),false);
 assert.equal(validGymResponse(`/gym/measurements/${ID}`,"delete",{entry:measure()}),false);
 assert.equal(validGymResponse("/gym/exercise-progress","post",progress(),{date:DAY,exerciseId:"bench",weight:"20.00"}),true);
 assert.equal(validGymResponse("/gym/exercise-progress","post",progress(),{date:"2026-10-10",exerciseId:"bench"}),false);
 assert.equal(validGymResponse("/gym/gallery","post",{id:ID,date:DAY,images:[]},{date:DAY,images:["not-confirmed"]}),false);
});
test("Mixed workout exercises and schedule values are rejected before any transaction",async t=>{
 t.mock.method(mongoose.connection,"transaction",()=>assert.fail("Invalid input must not transact"));
 for(const extra of[{days:["Sun",{}]},{title:"x".repeat(181)},{neverEnds:false,endDate:""},{goalType:{}},{startDate:null},{exercises:[{}]},{exercises:[{id:Infinity,name:"Press"}]},{exercises:[{id:"x".repeat(181),name:"Press"}]},{exercises:[{id:"x",name:"Press",sets:"3x"}]},{exercises:[{id:"x",name:"Press",weight:true}]},{exercises:[{id:"x",name:"Press",reps:"12-8"}]},{exercises:[{id:"x",name:"Press"},{id:"x",name:"Press"}]}])assert.equal((await call(createWorkoutPlan,req({...plan(),...extra}))).status,400);
});
test("Planned rep ranges remain usable and confirmed after creating a workout",async t=>{
 const session=transaction(t,WorkoutPlan,null),body=plan({exercises:[{id:"bench",name:"Bench",reps:"8-12"}]});
 t.mock.method(WorkoutPlan,"create",async([value],options)=>{assert.equal(value.userId,USER);assert.equal(options.session,session);return[{...value,_id:ID,createdAt:new Date(NOW),updatedAt:new Date(NOW)}]});
 const result=await call(createWorkoutPlan,req(body));assert.equal(result.status,201);assert.equal(result.body.exercises[0].reps,"8-12");assert.equal(validGymResponse("/gym/plans","post",result.body,{title:body.title,days:body.days,exercises:body.exercises}),true);
});
test("Exercise progress inserts retain createdAt when setting an explicit revision",async t=>{
 freeze(t);t.mock.method(GymExerciseProgress,"findOneAndUpdate",async(filter,update,options)=>{assert.equal(filter.userId,USER);assert.equal(options.upsert,true);assert.equal(options.timestamps,false);assert.equal(update.$setOnInsert.createdAt.toISOString(),NOW);return{_id:ID,...update.$set,createdAt:update.$setOnInsert.createdAt}});
 const body={date:DAY,exerciseId:"bench",weight:"20.00"};const result=await call(upsertExerciseProgress,req(body));assert.equal(result.status,200);assert.equal(validGymResponse("/gym/exercise-progress","post",result.body,body),true);
});
test("Diet macros and meals reject malformed types and oversized values",async t=>{
 t.mock.method(mongoose.connection,"transaction",()=>assert.fail("Invalid input must not transact"));
 for(const values of[{calories:true},{calories:[12]},{calories:{}},{calories:"12x"},{calories:"9".repeat(30)}])assert.equal((await call(createGymDietPlan,req({planType:"macros",day:"Sun",values}))).status,400);
 assert.equal((await call(createGymDietPlan,req({planType:"diet",day:"Sun",meals:{morning:[{name:"x".repeat(181)}]}}))).status,400);
});
test("Exercise progress rejects partial numbers, objects and invalid drop-set counts",async t=>{
 freeze(t);t.mock.method(GymExerciseProgress,"findOneAndUpdate",()=>assert.fail("Invalid input must not write"));
 for(const extra of[{sets:"3x"},{sets:true},{reps:[10]},{weight:"10kg"},{weight:-1},{weight:1001},{notes:{}},{exerciseName:{}},{repsBreakdown:{}},{repsBreakdown:["8+bad"]},{lastSetReps:"10+"},{expectedUpdatedAt:{}}])assert.equal((await call(upsertExerciseProgress,req({date:DAY,exerciseId:"bench",...extra}))).status,400);
});
for(const [Model,handler]of[[WorkoutPlan,updateWorkoutPlan],[WorkoutPlan,toggleWorkoutPlanActive],[WorkoutPlan,deleteWorkoutPlan],[GymDietPlan,updateGymDietPlan],[GymDietPlan,toggleGymDietPlanActive],[GymDietPlan,deleteGymDietPlan],[GymMeasurement,updateMeasurement],[GymMeasurement,deleteMeasurement],[GymMeasurement,undoDeleteMeasurement]])test(`${handler.name} rejects stale or malformed revisions without saving`,async t=>{
 freeze(t);const record={_id:ID,userId:USER,updatedAt:new Date(NOW),deletedAt:null,save(){assert.fail("No save on conflict")}};transaction(t,Model,record);
 for(const expectedUpdatedAt of["2026-10-11T05:00:00Z",{}])assert.equal((await call(handler,req({expectedUpdatedAt,isActive:true,bodyWeight:"81"}))).status,typeof expectedUpdatedAt==="string"?409:400);
});
test("Gym revision increments same-millisecond saves inside the owner-fenced session",async t=>{
 freeze(t);const session={fixture:true},record={updatedAt:new Date(NOW),async save(options){assert.equal(options.session,session);assert.equal(options.timestamps,false)}};
 await saveGymRecord(record,{expectedUpdatedAt:NOW},session);assert.equal(record.updatedAt.getTime(),Date.parse(NOW)+1);
 assert.throws(()=>checkGymRevision(record,{expectedUpdatedAt:NOW}),error=>error.status===409);
});
test("Exercise progress uses an atomic revision filter rather than overwriting a stale record",async t=>{
 freeze(t);t.mock.method(GymExerciseProgress,"findOneAndUpdate",async(filter,update,options)=>{assert.equal(filter.userId,USER);assert.equal(filter.updatedAt.toISOString(),NOW);assert.equal(options.upsert,false);assert.equal(options.timestamps,false);assert.ok(update.$set.updatedAt.getTime()>Date.parse(NOW));return null});
 assert.equal((await call(upsertExerciseProgress,req({date:DAY,exerciseId:"bench",sets:"3",expectedUpdatedAt:NOW}))).status,409);
});
test("Gym read failures do not reveal database secrets or masquerade as empty lists",async t=>{
 for(const[Model,handler]of[[WorkoutPlan,getWorkoutPlans],[GymDietPlan,getGymDietPlans],[GymMeasurement,getMeasurements]]){
  t.mock.method(Model,"find",()=>{throw new Error("PRIVATE DATABASE URI")});const result=await call(handler);assert.equal(result.status,500);assert.doesNotMatch(result.body.message,/PRIVATE/);
 }
});
test("Gym heatmap rejects partial, fractional and object-valued years",async()=>{
 for(const year of["2026x","2026.5",["2026"],"1e3",{}])assert.equal((await call(getGymHeatmap,{...req(),query:{year}})).status,400);
});
// Every section's registered read rejects malformed values before publish.
for(const path of["plans","diet-plans","measurements","gallery","library","exercise-progress","plans/logs"])test(`${path} response contract refuses malformed non-empty records`,()=>assert.equal(validGymResponse(`/gym/${path}`,"get",path==="exercise-progress"?{bad:{}}:[{}]),false));
