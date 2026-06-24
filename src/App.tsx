/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useDocenteStore } from "./store/docenteStore";
import GroupCard from "./components/GroupCard";
import GroupDetails from "./components/GroupDetails";
import StudentPortal from "./components/StudentPortal";
import {
  GraduationCap,
  BookOpen,
  Plus,
  LogOut,
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  Database,
  ArrowLeft,
} from "lucide-react";

export default function App() {
  const currentView = useDocenteStore((state) => state.currentView);
  const setView = useDocenteStore((state) => state.setView);
  const initialize = useDocenteStore((state) => state.initialize);
  const isAuthenticated = useDocenteStore((state) => state.isAuthenticated);
  const authLoading = useDocenteStore((state) => state.authLoading);
  const authError = useDocenteStore((state) => state.authError);
  const clearAuthError = useDocenteStore((state) => state.clearAuthError);
  const currentTeacher = useDocenteStore((state) => state.currentTeacher);
  const isFirebaseMode = useDocenteStore((state) => state.isFirebaseMode);

  // Store actions
  const loginTeacher = useDocenteStore((state) => state.loginTeacher);
  const registerTeacher = useDocenteStore((state) => state.registerTeacher);
  const logoutTeacher = useDocenteStore((state) => state.logoutTeacher);
  const groups = useDocenteStore((state) => state.groups);
  const students = useDocenteStore((state) => state.students);
  const createGroup = useDocenteStore((state) => state.createGroup);
  const deleteGroup = useDocenteStore((state) => state.deleteGroup);
  const activeGroupId = useDocenteStore((state) => state.activeGroupId);
  const setActiveGroup = useDocenteStore((state) => state.setActiveGroup);

  // Local form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Group creation form states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupYear, setGroupYear] = useState("");
  const [groupFormError, setGroupFormError] = useState<string | null>(null);

  // URL route handling
  useEffect(() => {
    initialize();

    // Route /portal detection
    const handleRouting = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === "/portal" || hash === "#portal") {
        setView("student-portal");
      }
    };

    handleRouting();
    window.addEventListener("popstate", handleRouting);
    return () => window.removeEventListener("popstate", handleRouting);
  }, []);

  const handleDemoLogin = () => {
    setLoginEmail("profe@sistema.com");
    setLoginPassword("123456");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setSubmitLoading(true);
    const success = await loginTeacher(loginEmail.trim(), loginPassword.trim());
    setSubmitLoading(false);
    if (success) {
      setView("teacher-dashboard");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) return;
    setSubmitLoading(true);
    const success = await registerTeacher(registerName.trim(), registerEmail.trim(), registerPassword.trim());
    setSubmitLoading(false);
    if (success) {
      setView("teacher-dashboard");
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupFormError(null);
    const name = groupName.trim();
    const year = groupYear.trim();

    if (!name || !year) {
      setGroupFormError("Ambos campos son obligatorios.");
      return;
    }

    try {
      await createGroup(name, year);
      setGroupName("");
      setGroupYear("");
      setShowCreateGroup(false);
    } catch (err) {
      setGroupFormError("Error al crear el grupo.");
    }
  };

  if (authLoading) {
    return (
      <div id="loader-container" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <GraduationCap className="w-12 h-12 text-indigo-600 animate-bounce mb-3" />
          <h2 className="text-sm font-bold text-slate-700">Sistema Docente Simple</h2>
          <p className="text-xs text-slate-400 mt-1">Cargando credenciales y base de datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-700 font-sans flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setActiveGroup(null); setView("landing"); }}>
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span id="app-title" className="font-extrabold text-sm text-slate-800 block tracking-tight">Sistema Docente</span>
              <span className="text-[9px] text-slate-400 block font-semibold tracking-wider uppercase">Simple & Eficiente</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Database indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-semibold text-slate-500">
              <Database className="w-3 h-3 text-indigo-500" />
              <span>Base: {isFirebaseMode ? "Firestore Live" : "Local (Desarrollo)"}</span>
            </div>

            {currentView === "landing" && (
              <>
                <button
                  id="nav-btn-portal"
                  onClick={() => setView("student-portal")}
                  className="px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
                >
                  Portal Alumnos
                </button>
                <button
                  id="nav-btn-teacher"
                  onClick={() => {
                    if (isAuthenticated) {
                      setView("teacher-dashboard");
                    } else {
                      setView("teacher-login");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Ingreso Profesor
                </button>
              </>
            )}

            {currentView !== "landing" && (
              <button
                id="nav-btn-home"
                onClick={() => {
                  if (currentView === "student-dashboard") {
                    // Log out student first
                    useDocenteStore.getState().logoutStudent();
                  } else {
                    setView("landing");
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            )}

            {isAuthenticated && currentView.startsWith("teacher") && (
              <button
                id="nav-btn-logout-teacher"
                onClick={() => logoutTeacher()}
                className="p-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-lg transition text-slate-500"
                title="Cerrar sesión Profesor"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-grow">
        {/* VIEW 1: LANDING */}
        {currentView === "landing" && (
          <div id="landing-view" className="py-8 md:py-16 space-y-12">
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Gestión de Grupos y Calificaciones</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Administra tus clases con simplicidad absoluta.
              </h1>
              <p className="text-base text-slate-400">
                La herramienta minimalista diseñada para profesores que buscan un control rápido de alumnos y calificaciones, y alumnos que consultan sus notas en tiempo real.
              </p>
            </div>

            {/* Selection Grid (Double gates) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
              {/* Gate 1: Teacher */}
              <div
                id="gate-teachers"
                onClick={() => {
                  if (isAuthenticated) {
                    setView("teacher-dashboard");
                  } else {
                    setView("teacher-login");
                  }
                }}
                className="group bg-white border border-slate-100 rounded-2xl p-8 hover:border-indigo-500 hover:shadow-lg transition cursor-pointer flex flex-col justify-between h-80 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-full -z-10 group-hover:bg-indigo-50/40 transition" />
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl inline-block group-hover:bg-indigo-600 group-hover:text-white transition">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition">
                    Acceso para Profesores
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Crea tus grupos escolares, edita información, gestiona categorías de evaluación (ponderación), importa alumnos desde Excel/CSV y captura calificaciones de forma ágil.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
                  <span>Ingresar como docente</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Gate 2: Students */}
              <div
                id="gate-students"
                onClick={() => setView("student-portal")}
                className="group bg-white border border-slate-100 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-lg transition cursor-pointer flex flex-col justify-between h-80 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-bl-full -z-10 group-hover:bg-emerald-50/40 transition" />
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-block group-hover:bg-emerald-600 group-hover:text-white transition">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition">
                    Portal de Consulta Alumnos
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Accede de forma privada utilizando tu matrícula y código de acceso único provisto por tu profesor para revisar promedios ponderados, estatus y boleta de calificaciones.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Consultar mis calificaciones</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Quick URL notice */}
            <div className="text-center text-xs text-slate-400 max-w-sm mx-auto bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Los alumnos pueden ingresar directamente agregando <strong className="text-slate-600">/portal</strong> al final de la URL del sitio.</span>
            </div>
          </div>
        )}

        {/* VIEW 2: TEACHER LOGIN */}
        {currentView === "teacher-login" && (
          <div id="teacher-login-view" className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">Acceso Docente</h2>
                <p className="text-xs text-slate-400 mt-1">Ingresa con tu correo y contraseña institucional</p>
              </div>

              {authError && (
                <div id="teacher-login-error" className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3.5 text-xs flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); clearAuthError(); }}
                      placeholder="nombre@colegio.com"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); clearAuthError(); }}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-100 transition flex items-center justify-center"
                >
                  {submitLoading ? "Verificando..." : "Ingresar"}
                </button>
              </form>

              {/* Demo Account quick action (Very helpful for reviews) */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>💡 Cuenta Demo (Prueba Rápida)</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Usa estas credenciales para iniciar sesión sin registrarte.
                </p>
                <div className="text-[11px] font-mono bg-white border border-slate-100 p-2 rounded text-slate-600 space-y-1">
                  <div>Correo: <span className="font-semibold text-indigo-600">profe@sistema.com</span></div>
                  <div>Clave: <span className="font-semibold text-indigo-600">123456</span></div>
                </div>
                <button
                  id="btn-autofill-demo"
                  onClick={handleDemoLogin}
                  className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition"
                >
                  Autocompletar Credenciales
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                  ¿No tienes una cuenta?{" "}
                  <button
                    id="btn-go-register"
                    onClick={() => { setView("teacher-register"); clearAuthError(); }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: TEACHER REGISTER */}
        {currentView === "teacher-register" && (
          <div id="teacher-register-view" className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-xl space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">Registro Docente</h2>
                <p className="text-xs text-slate-400 mt-1">Crea tu cuenta de profesor para administrar tus grupos</p>
              </div>

              {authError && (
                <div id="teacher-register-error" className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3.5 text-xs flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-name"
                      type="text"
                      value={registerName}
                      onChange={(e) => { setRegisterName(e.target.value); clearAuthError(); }}
                      placeholder="Ej: Prof. Carlos Pérez"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => { setRegisterEmail(e.target.value); clearAuthError(); }}
                      placeholder="nombre@colegio.com"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => { setRegisterPassword(e.target.value); clearAuthError(); }}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-100 transition flex items-center justify-center"
                >
                  {submitLoading ? "Registrando..." : "Registrarse"}
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    id="btn-go-login"
                    onClick={() => { setView("teacher-login"); clearAuthError(); }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Inicia sesión aquí
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: TEACHER DASHBOARD */}
        {currentView === "teacher-dashboard" && (
          <div id="teacher-dashboard-view">
            {activeGroupId ? (
              /* Group details view when a group is open */
              <GroupDetails groupId={activeGroupId} onBack={() => setActiveGroup(null)} />
            ) : (
              /* General Dashboard overview listing groups */
              <div className="space-y-8 animate-fade-in">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Panel de Control: {currentTeacher?.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">Administra tus grupos y consulta la base de datos escolar.</p>
                  </div>
                  <button
                    id="btn-show-create-group"
                    onClick={() => {
                      setShowCreateGroup(!showCreateGroup);
                      setGroupFormError(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Nuevo Grupo
                  </button>
                </div>

                {/* Group creation panel inline */}
                {showCreateGroup && (
                  <div id="create-group-form" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-md max-w-xl mx-auto space-y-4 animate-slide-up">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Crear Nuevo Grupo</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Define el nombre de la clase y el periodo escolar correspondientes.</p>
                    </div>

                    {groupFormError && (
                      <div id="group-form-error" className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-xs flex items-center gap-1.5">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{groupFormError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="new-group-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Nombre del Grupo (Asignatura)
                          </label>
                          <input
                            id="new-group-name"
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Ej: Matemáticas 3º B"
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="new-group-year" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Ciclo Escolar / Periodo
                          </label>
                          <input
                            id="new-group-year"
                            type="text"
                            value={groupYear}
                            onChange={(e) => setGroupYear(e.target.value)}
                            placeholder="Ej: 2025 - 2026"
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          id="btn-cancel-create-group"
                          type="button"
                          onClick={() => setShowCreateGroup(false)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          id="btn-submit-create-group"
                          type="submit"
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                        >
                          Crear Grupo
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Groups Grid */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Mis Grupos ({groups.length})</h3>

                  {groups.length === 0 ? (
                    <div id="empty-groups-state" className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 max-w-md mx-auto space-y-4">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full inline-block">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Aún no tienes grupos creados</h4>
                      <p className="text-xs text-slate-400">Comienza haciendo clic en el botón de arriba para crear tu primer grupo escolar y registrar alumnos.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groups.map((group) => (
                        <GroupCard
                          key={group.id}
                          group={group}
                          students={students}
                          onSelect={(id) => setActiveGroup(id)}
                          onDelete={(id) => deleteGroup(id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 5: STUDENT PORTAL (GATE/LOGIN & DASHBOARD REPRODUCED) */}
        {currentView === "student-portal" && <StudentPortal />}
        {currentView === "student-dashboard" && <StudentPortal />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>© 2026 <strong>Sistema Docente Simple</strong>. Diseñado para educadores.</span>
          </div>
          <div className="flex gap-4">
            <button id="footer-btn-profes" onClick={() => setView("teacher-login")} className="hover:text-indigo-600 font-semibold transition">Docentes</button>
            <button id="footer-btn-alumnos" onClick={() => setView("student-portal")} className="hover:text-indigo-600 font-semibold transition">Alumnos</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple local mini-icon helper component
function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
