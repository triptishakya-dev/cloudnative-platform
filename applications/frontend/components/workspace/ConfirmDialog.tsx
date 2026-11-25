"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
export function ConfirmDialog({title,onCancel,busy=false,children}:{title:string;onCancel:()=>void;busy?:boolean;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);const id=useId();
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="confirmation" aria-labelledby={id} onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}><div><h2 id={id}>{title}</h2>{children}</div></dialog>;
}
