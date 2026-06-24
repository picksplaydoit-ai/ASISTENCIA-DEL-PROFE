/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Group, Student } from "../types";
import { Users, Calendar, ArrowRight, BookOpen } from "lucide-react";

interface GroupCardProps {
  key?: string;
  group: Group;
  students: Student[];
  onSelect: (groupId: string) => void;
}

export default function GroupCard({ group, students, onSelect }: GroupCardProps) {
  const groupStudentsCount = students.filter((s) => s.groupId === group.id).length;

  return (
    <div
      id={`group-card-${group.id}`}
      onClick={() => onSelect(group.id)}
      className="group bg-white border border-slate-100 rounded-xl p-5 hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden"
    >
      {/* Visual background element */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-bl-full -z-10 group-hover:bg-indigo-50/40 transition-colors" />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
            Grupo Escolar
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {group.name}
        </h4>
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-medium" title="Alumnos registrados">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{groupStudentsCount} {groupStudentsCount === 1 ? "alumno" : "alumnos"}</span>
          </div>
          <div className="flex items-center gap-1 font-medium" title="Ciclo escolar">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{group.schoolYear}</span>
          </div>
        </div>
        <div className="text-indigo-600 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <span>Abrir</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
