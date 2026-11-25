"use client";
import { Failure } from "@/components/workspace/UI";
export default function Error({reset}:{reset:()=>void}){return <Failure message="This page couldn’t load. Please try again." retry={reset}/>;}
