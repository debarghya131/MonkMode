import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import { createHabit, updateHabit, deleteHabit, restoreHabit, toggleImportant, getHabits, getHabitTracking, getHabitConsistency, getHabitHeatmap, completeHabit, undoCompleteHabit } from "../controllers/habitController.js";
import { calculateStreak } from "../utils/streakUtils.js";
import { validHabit, validHabits, validHabitTracking, validHabitConsistency, validHabitCompletion, validHabitImportant, validHabitDeletion, habitFailureMessage } from "../../client/src/dashboard/habits/habitResponse.js";
const USER="000000000000000000000001",ID="000000000000000000000002",NOW="2026-10-11T06:00:00.000Z",DAY="2026-10-11";
const req=extra=>({user:{id:USER},body:{},params:{id:ID},query:{},...extra});
const clock=t=>t.mock.timers.enable({apis:["Date"],now:Date.parse(NOW)});
const dto=extra=>({_id:ID,title:"Habit",category:"Health",priority:"High",time:"08:00",repeatType:"daily",timeOfDay:"Morning",targetStreak:21,isImportant:false,startDate:DAY,endDate:null,createdAt:NOW,updatedAt:NOW,completedToday:false,currentStreak:0,maxStreak:0,streakBreaks:0,activityLogs:[],...extra});
const doc=extra=>{const value={...dto(),userId:USER,startDate:new Date("2026-10-11T00:00:00+05:30"),updatedAt:new Date(NOW),save:async()=>{},...extra};value.toObject=()=>{const {save,toObject,_doc,$where,...raw}=value;void save;void toObject;void _doc;void $where;return raw;};value._doc=value.toObject();return value;};
async function call(handler,request=req()){let status=200,body;await handler(request,{status(n){status=n;return this;},json(data){body=JSON.parse(JSON.stringify(data));return this;}});return{status,body};}
test("habit DTOs distinguish valid empty data from malformed object leaves",()=>{
 assert.equal(validHabits([]),true);assert.equal(validHabit(dto()),true);assert.equal(validHabitTracking([],2026,10),true);
 for(const extra of [{title:{}},{note:{}},{time:{}},{category:{}},{activityLogs:[{title:"x",at:"bad",action:"created"}]},{targetStreak:true},{updatedAt:{}},{startDate:"2026-02-30"},{pendingDays:[{}]}])assert.equal(validHabit(dto(extra)),false);
 assert.equal(validHabits([dto(),dto()]),false);assert.equal(validHabits([null]),false);
 const row=dto({completedDays:[1,11]});assert.equal(validHabitTracking([row],2026,10),true);assert.equal(validHabitTracking([{...row,completedDays:[30]}],2026,2),false);assert.equal(validHabitTracking([{...row,completedDays:[1,1]}],2026,10),false);
 assert.equal(validHabitCompletion({habitId:ID,dayKey:DAY,completed:true},ID,DAY,true),true);assert.equal(validHabitCompletion({message:"success"},ID,DAY,true),false);
 assert.equal(validHabitImportant({habitId:ID,isImportant:true,updatedAt:NOW},ID,true),true);assert.equal(validHabitImportant({isImportant:true},ID,true),false);
 assert.equal(validHabitDeletion({habit:dto({deletedAt:NOW})},ID),true);assert.equal(validHabitDeletion({habit:dto()},ID),false);
 assert.equal(habitFailureMessage({response:{data:{message:{}}}},"Safe"),"Safe");
});
test("creation rejects backdating, oversized text and falsely typed flags or targets",async t=>{
 clock(t);t.mock.method(Habit,"create",()=>assert.fail("Invalid input must not persist"));
 for(const extra of [{startDate:"2026-10-10"},{title:"x".repeat(181)},{category:"x".repeat(81)},{note:"x".repeat(2501)},{isImportant:"false"},{targetStreak:true},{targetStreak:[21]},{targetStreak:Number.MAX_SAFE_INTEGER+1},{repeatType:"7days",endDate:"2026-11-11"}])assert.equal((await call(createHabit,req({body:{title:"Habit",startDate:DAY,...extra}}))).status,400);
});
test("fixed-duration creation enforces inclusive end dates and safe default streaks",async t=>{
 clock(t);t.mock.method(Habit,"create",async value=>value);
 for(const [repeatType,endDate,target]of [["7days","2026-10-17",7],["21days","2026-10-31",21]]){const result=await call(createHabit,req({body:{title:"Habit",repeatType,startDate:DAY}}));assert.equal(result.status,201);assert.equal(result.body.endDate.slice(0,10),new Date(endDate+"T00:00:00+05:30").toISOString().slice(0,10));assert.equal(result.body.targetStreak,target);}
});
test("blank categories normalize to General instead of creating a record that breaks habit reads",async t=>{
 clock(t);t.mock.method(Habit,"create",async value=>{assert.equal(value.category,"General");return dto(value);});
 const created=await call(createHabit,req({body:{title:"Habit",category:"   "}}));assert.equal(created.status,201);assert.equal(validHabit(created.body),true);
 t.mock.method(Habit,"findOne",async()=>doc());t.mock.method(Habit,"findOneAndUpdate",async(filter,update)=>{assert.equal(update.$set.category,"General");return doc(update.$set);});
 const edited=await call(updateHabit,req({body:{category:"   ",expectedUpdatedAt:NOW}}));assert.equal(edited.status,200);assert.equal(validHabit(edited.body),true);
});
for(const handler of [updateHabit,deleteHabit,restoreHabit,toggleImportant])test(`${handler.name} rejects stale revisions and another account's record`,async t=>{
 clock(t);t.mock.method(Habit,"findOne",async filter=>{assert.equal(filter.userId,USER);return doc({deletedAt:handler===restoreHabit?new Date(NOW):null,archivedReason:handler===restoreHabit?"deleted":null});});
 t.mock.method(Habit,"findOneAndUpdate",()=>assert.fail("Conflict must not persist"));
 assert.equal((await call(handler,req({body:{expectedUpdatedAt:"2026-10-11T05:00:00Z"}}))).status,409);assert.equal((await call(handler,req({body:{expectedUpdatedAt:{}}}))).status,400);
 t.mock.method(Habit,"findOne",async()=>null);assert.equal((await call(handler)).status,404);
});
test("atomic update filters include owner and revision and advance a same-millisecond timestamp",async t=>{
 clock(t);t.mock.method(Habit,"findOne",async()=>doc());
 t.mock.method(Habit,"findOneAndUpdate",async(filter,update,options)=>{assert.equal(filter.userId,USER);assert.equal(filter.updatedAt.toISOString(),NOW);assert.ok(update.$set.updatedAt.getTime()>Date.parse(NOW));assert.equal(options.runValidators,true);assert.equal(options.timestamps,false);return doc(update.$set);});
 assert.equal((await call(updateHabit,req({body:{title:"Edited",expectedUpdatedAt:NOW}}))).status,200);
 t.mock.method(Habit,"findOneAndUpdate",async()=>null);assert.equal((await call(updateHabit,req({body:{title:"Edited",expectedUpdatedAt:NOW}}))).status,409);
});
test("important saves use real Mongoose atomic owner/revision filters",async t=>{
 clock(t);const habit=Habit.hydrate({...dto(),userId:USER,startDate:new Date("2026-10-11T00:00:00+05:30"),createdAt:new Date(NOW),updatedAt:new Date(NOW),__v:0});
 t.mock.method(Habit,"findOne",async()=>habit);t.mock.method(Habit.collection,"updateOne",async(filter,update)=>{assert.ok(filter.userId instanceof mongoose.Types.ObjectId);assert.equal(String(filter.userId),USER);assert.equal(filter.updatedAt.toISOString(),NOW);assert.ok(update.$set.updatedAt>Date.parse(NOW));return{acknowledged:true,matchedCount:1,modifiedCount:1};});
 const result=await call(toggleImportant,req({body:{isImportant:true,expectedUpdatedAt:NOW}}));assert.equal(result.status,200);assert.equal(validHabitImportant(result.body,ID,true),true);
});
test("started dates cannot be cleared and future habits cannot be rescheduled into the past",async t=>{
 clock(t);t.mock.method(Habit,"findOneAndUpdate",()=>assert.fail("Invalid schedule must not persist"));
 t.mock.method(Habit,"findOne",async()=>doc());assert.equal((await call(updateHabit,req({body:{startDate:null}}))).status,400);
 t.mock.method(Habit,"findOne",async()=>doc({startDate:new Date("2026-10-12T00:00:00+05:30")}));assert.equal((await call(updateHabit,req({body:{startDate:"2026-10-10"}}))).status,400);
});
test("read endpoints never write due schedule changes or automatic ended logs",async t=>{
 clock(t);const habit=doc({pendingTime:"20:00",timeChangeEffectiveFrom:new Date("2026-10-11T00:00:00+05:30"),save(){assert.fail("Read must not persist");}});
 t.mock.method(Habit,"find",()=>({then:resolve=>resolve([habit]),sort:async()=>[habit],select:async()=>[habit]}));t.mock.method(HabitLog,"find",()=>({select:async()=>[]}));t.mock.method(HabitLog,"aggregate",async()=>[]);
 for(const [handler,request]of [[getHabits,req()],[getHabitTracking,req({query:{year:"2026",month:"10"}})],[getHabitConsistency,req()],[getHabitHeatmap,req()]])assert.equal((await call(handler,request)).status,200,handler.name);
 habit.endDate=new Date("2026-10-10T00:00:00+05:30");habit._doc=habit.toObject();assert.equal((await call(getHabits)).status,200);assert.equal(habit.time,"08:00");assert.equal(habit.activityLogs.length,0);
});
test("deferred weekday changes preserve scheduling history for streak calculations",t=>{
 clock(t);const habit=doc({startDate:new Date("2026-10-09T00:00:00+05:30"),createdAt:new Date("2026-10-09T00:00:00+05:30"),repeatType:"weekdays",days:["Fri","Sat"],pendingDays:["Sun"],daysChangeEffectiveFrom:new Date("2026-10-11T00:00:00+05:30")});
 assert.equal(calculateStreak(["2026-10-09","2026-10-10","2026-10-11"].map(dayKey=>({dayKey,completed:true})),habit).currentStreak,3);
});
test("completion undo removes all today's legacy duplicates but not another day",async t=>{
 clock(t);t.mock.method(Habit,"findOne",async()=>doc());t.mock.method(HabitLog,"deleteMany",async filter=>{assert.equal(filter.habitId,ID);assert.equal(filter.$or[0].dayKey,DAY);return{deletedCount:2};});
 const result=await call(undoCompleteHabit,req({body:{date:DAY}}));assert.equal(result.status,200);assert.equal(validHabitCompletion(result.body,ID,DAY,false),true);
});
test("tracking rejects partial/fractional periods and database failures hide internal details",async t=>{
 for(const query of [{year:"2026x",month:"10"},{year:"2026",month:"10.5"},{year:["2026"],month:"10"},{year:"2026",month:["10"]},{year:"2026",month:"1e1"}])assert.equal((await call(getHabitTracking,req({query}))).status,400);
 for(const year of [["2026"],{},"2026x","2026.0"])assert.equal((await call(getHabitHeatmap,req({query:{year}}))).status,400);
 t.mock.method(Habit,"findOne",async()=>{throw new Error("private database details");});const result=await call(toggleImportant);assert.equal(result.status,503);assert.doesNotMatch(result.body.message,/private/);
});
test("empty habit statistics satisfy the strict client contract",async t=>{clock(t);t.mock.method(Habit,"find",()=>({select:async()=>[]}));assert.equal(validHabitConsistency((await call(getHabitConsistency)).body),true);});

test("retained day keys take precedence over timestamps without creating extra completion days",async t=>{
 clock(t);const habit=doc({startDate:new Date("2026-10-10T00:00:00+05:30"),createdAt:new Date("2026-10-10T00:00:00+05:30")});
 const logs=[{habitId:ID,dayKey:"2026-10-10",date:new Date(NOW),completed:true}];
 t.mock.method(Habit,"find",()=>({sort:async()=>[habit]}));t.mock.method(HabitLog,"find",()=>({select:async()=>logs}));
 const result=await call(getHabits);assert.equal(result.status,200);assert.equal(result.body[0].completedToday,false);assert.equal(result.body[0].currentStreak,1);
 assert.equal(calculateStreak(logs,habit).maxStreak,1);
});
test("tracking filters future or invalid completion days and deduplicates retained records",async t=>{
 clock(t);const habit=doc();const logs=["2026-10-11","2026-10-11","2026-10-12","2026-10-32"].map(dayKey=>({habitId:ID,dayKey,completed:true}));
 t.mock.method(Habit,"find",async()=>[habit]);t.mock.method(HabitLog,"find",()=>({select:async()=>logs}));
 const result=await call(getHabitTracking,req({query:{year:"2026",month:"10"}}));assert.equal(result.status,200);assert.deepEqual(result.body[0].completedDays,[11]);assert.equal(validHabitTracking(result.body,2026,10),true);
});
test("completion re-enables a legacy false log instead of falsely reporting an unchanged completion",async t=>{
 clock(t);t.mock.method(Habit,"findOne",async()=>doc());t.mock.method(HabitLog,"updateOne",async(filter,update,options)=>{
  assert.deepEqual(filter,{habitId:ID,dayKey:DAY});assert.equal(update.$set.completed,true);assert.equal(update.$setOnInsert.completed,undefined);assert.equal(options.upsert,true);return{upsertedCount:0,modifiedCount:1};
 });
 const result=await call(completeHabit,req({body:{date:DAY}}));assert.equal(result.status,200);assert.equal(validHabitCompletion(result.body,ID,DAY,true),true);
});
