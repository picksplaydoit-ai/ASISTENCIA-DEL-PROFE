/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import StudentImporter from "./StudentImporter";
import CategoryManager from "./CategoryManager";
import GradesTable from "./GradesTable";
import AttendanceManager from "./AttendanceManager";
import ActivitiesManager from "./ActivitiesManager";
import TeamsManager from "./TeamsManager";
import { ArrowLeft, Users, Settings, Plus, Trash2, Edit, Save, BookOpen, Key, AlertCircle, FileSpreadsheet, Percent, CalendarCheck, ClipboardList, Group as GroupIcon } from "lucide-react";

interface GroupDetailsProps {
  groupId: string;
  onBack: () => void;
}

export default function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const groups = useDocenteStore((state) => state.groups);
  const group = React.useMemo(() =>
    groups.find((g) => g.id === groupId),
    [groups, groupId]
  );
  const allStudents = useDocenteStore((state) => state.students);
  const students = React.useMemo(() =>
    allStudents.filter((s) => s.groupId === groupId),
    [allStudents, groupId]
  );
  const allCategories = useDocenteStore((state) => state.categories);
  const categories = React.useMemo(() =>
    allCategories.filter((c) => c.groupId === groupId),
    [allCategories, groupId]
  );
  const deleteStudent = useDocenteStore((state) => state.deleteStudent);
  const deleteAllStudents = useDocenteStore((state) => state.deleteAllStudents);
  const updateGroup = useDocenteStore((state) => state.updateGroup);
  const deleteGroup = useDocenteStore((state) => state.deleteGroup);

  const [activeTab, setActiveTab] = useState<"students" | "categories" | "grades" | "attendance" | "activities" | "teams">("students");

  // Group settings edit state
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState(group?.name || "");
  const [editGroupYear, setEditGroupYear] = useState(group?.schoolYear || "");
  const [editGroupReqAttendance, setEditGroupReqAttendance] = useState(group?.requiredAttendancePercentage || 80);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Manual student add state
  const [showAddSingle, setShowAddSingle] = useState(false);
  const [singleStudentName, setSingleStudentName] = useState("");
  const [singleStudentMatricula, setSingleStudentMatricula] = useState("");
  const importStudents = useDocenteStore((state) => state.importStudents);

  if (!group) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Grupo no encontrado</h3>
        <p className="text-sm text-slate-500 mb-6">El grupo seleccionado no existe o fue eliminado.</p>
        <button
          id="btn-error-back"
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold text-xs transition"
        >
          Regresar al panel
        </button>
      </div>
    );
  }

  const handleUpdateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    if (!editGroupName.trim() || !editGroupYear.trim()) {
      setGroupError("Ambos campos son obligatorios.");
      return;
    }
    try {
      await updateGroup(groupId, editGroupName.trim(), editGroupYear.trim(), editGroupReqAttendance);
      setIsEditingGroup(false);
    } catch (e) {
      setGroupError("Error al actualizar los datos.");
    }
  };

  const handleDeleteGroupClick = async () => {
    if (
      confirm(
        `¿Está completamente seguro de eliminar el grupo "${group.name}"? Esta acción borrará de manera irreversible todos los alumnos, categorías y calificaciones registradas en él.`
      )
    ) {
      await deleteGroup(groupId);
      onBack();
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    const name = singleStudentName.trim();
    const matricula = singleStudentMatricula.trim();

    if (!name || !matricula) {
      setGroupError("Nombre y matrícula son requeridos.");
      return;
    }

    if (students.some((s) => s.matricula.toLowerCase() === matricula.toLowerCase())) {
      setGroupError("Ya existe un alumno con esta matrícula en este grupo.");
      return;
    }

    try {
      await importStudents(groupId, [{ name, matricula }]);
      setSingleStudentName("");
      setSingleStudentMatricula("");
      setShowAddSingle(false);
    } catch (err) {
      setGroupError("Error al registrar el alumno.");
    }
  };

  const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);

  return (
    <div id="group-details-root" className="max-w-6xl mx-auto space-y-6">
      {/* Back Button and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-dashboard"
            onClick={onBack}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600 shadow-sm"
            title="Regresar a grupos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            {isEditingGroup ? (
              <form onSubmit={handleUpdateGroupSubmit} className="flex items-center gap-2">
                <input
                  id="input-edit-group-name"
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="text-lg font-bold border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <input
                  id="input-edit-group-year"
                  type="text"
                  value={editGroupYear}
                  onChange={(e) => setEditGroupYear(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <button
                  id="btn-save-group-settings"
                  type="submit"
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                  title="Guardar"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-cancel-group-edit"
                  type="button"
                  onClick={() => {
                    setIsEditingGroup(false);
                    setEditGroupName(group.name);
                    setEditGroupYear(group.schoolYear);
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                  title="Cancelar"
                >
                  Regresar
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">{group.name}</h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {group.schoolYear}
                </span>
                <button
                  id="btn-edit-group-trigger"
                  onClick={() => setIsEditingGroup(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                  title="Editar nombre/ciclo"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">Gestión completa del grupo, ponderaciones y capturas</p>
          </div>
        </div>

        <button
          id="btn-delete-group"
          onClick={handleDeleteGroupClick}
          className="flex items-center gap-1 px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg transition shadow-sm self-start"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar Grupo
        </button>
      </div>

      {groupError && (
        <div id="group-action-error" className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-xs flex items-center gap-2 max-w-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{groupError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Alumnos Registrados</div>
            <div className="text-lg font-bold text-slate-800">{students.length}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Categorías de Evaluación</div>
            <div className="text-lg font-bold text-slate-800">
              {categories.length} <span className="text-xs font-normal text-slate-400">({totalPercentage}% total)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Estado de Calificaciones</div>
            <div className="text-xs font-bold text-slate-800 mt-1">
              {categories.length > 0 && totalPercentage === 100 ? (
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Listo</span>
              ) : (
                <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">Faltan Categorías (Suma: {totalPercentage}%)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Level Tab Bar */}
      <div className="flex flex-wrap border-b border-slate-100 bg-white rounded-xl p-1 shadow-sm gap-1">
        <button
          id="subtab-students"
          onClick={() => setActiveTab("students")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "students" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Alumnos
        </button>
        <button
          id="subtab-attendance"
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "attendance" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Asistencia
        </button>
        <button
          id="subtab-teams"
          onClick={() => setActiveTab("teams")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "teams" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <GroupIcon className="w-4 h-4" />
          Equipos
        </button>
        <button
          id="subtab-categories"
          onClick={() => setActiveTab("categories")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "categories" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Percent className="w-4 h-4" />
          Rúbrica
        </button>
        <button
          id="subtab-activities"
          onClick={() => setActiveTab("activities")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "activities" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Actividades
        </button>
        <button
          id="subtab-grades"
          onClick={() => setActiveTab("grades")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition ${
            activeTab === "grades" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Calificaciones
        </button>
      </div>

      {/* Active Tab Panels */}
      <div className="space-y-6">
        {/* TAB 1: STUDENTS MANAGEMENT */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Student list + individual actions */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Directorio de Alumnos</h3>
                  <p className="text-xs text-slate-500">Listado general de alumnos registrados y credenciales de ingreso.</p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={async () => {
                      if (students.length === 0) return;
                      if (confirm("¿Estás seguro de que deseas eliminar a TODOS los alumnos de este grupo? Esta acción también borrará sus calificaciones y es irreversible.")) {
                        await deleteAllStudents(groupId);
                      }
                    }}
                    disabled={students.length === 0}
                    className="flex items-center justify-center gap-1 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 disabled:opacity-50 text-xs font-bold rounded-lg transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Todos
                  </button>
                  <button
                    id="btn-toggle-add-student"
                    onClick={() => {
                      setShowAddSingle(!showAddSingle);
                      setGroupError(null);
                    }}
                    className="flex items-center justify-center gap-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddSingle ? "Cerrar Registro" : "Registrar Alumno Individual"}
                  </button>
                </div>
              </div>

              {/* Single student add form */}
              {showAddSingle && (
                <form onSubmit={handleAddSingleStudent} className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre del Alumno</label>
                    <input
                      id="input-single-student-name"
                      type="text"
                      value={singleStudentName}
                      onChange={(e) => setSingleStudentName(e.target.value)}
                      placeholder="Ej: Sofía Martínez"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Matrícula</label>
                    <input
                      id="input-single-student-matricula"
                      type="text"
                      value={singleStudentMatricula}
                      onChange={(e) => setSingleStudentMatricula(e.target.value)}
                      placeholder="Ej: 23004"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      id="btn-submit-single-student"
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      Agregar Alumno
                    </button>
                  </div>
                </form>
              )}

              {/* Students grid or placeholder */}
              {students.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-100 rounded-lg">
                  No hay alumnos registrados en este grupo. Utiliza el importador masivo o agrégalos de forma individual.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Alumno</th>
                        <th className="px-4 py-3 w-40">Matrícula</th>
                        <th className="px-4 py-3 w-44">Código de Acceso (Portal)</th>
                        <th className="px-4 py-3 w-20 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-2.5 font-bold text-slate-800">{student.name}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{student.matricula}</td>
                          <td className="px-4 py-2.5 font-mono text-indigo-600 font-bold bg-indigo-50/10 rounded-md">
                            <span className="flex items-center gap-1">
                              <Key className="w-3 h-3 text-indigo-400" />
                              {student.accessCode}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              id={`btn-delete-student-${student.id}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Desea eliminar al alumno "${student.name}"? Se borrarán de forma irreversible todas sus calificaciones registradas.`
                                  )
                                ) {
                                  deleteStudent(student.id);
                                }
                              }}
                              className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                              title="Eliminar Alumno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Embed Mass Importer */}
            <StudentImporter groupId={groupId} />
          </div>
        )}

        {/* TAB 2: CATEGORY PONDERATIONS */}
        {activeTab === "categories" && <CategoryManager groupId={groupId} />}

        {/* TAB 3: GRADES CONTROL PANELS */}
        {activeTab === "grades" && <GradesTable groupId={groupId} />}

        {/* TAB 4: ATTENDANCE */}
        {activeTab === "attendance" && <AttendanceManager groupId={groupId} />}

        {/* TAB 5: ACTIVITIES */}
        {activeTab === "activities" && <ActivitiesManager groupId={groupId} />}

        {/* TAB 6: TEAMS */}
        {activeTab === "teams" && <TeamsManager groupId={groupId} />}
      </div>
    </div>
  );
}
