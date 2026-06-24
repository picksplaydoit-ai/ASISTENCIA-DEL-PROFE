/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { Teacher, Group, Student, Category, Grade } from "../types";
import { db, auth, isLocalStorageFallback } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";

interface DocenteState {
  // Auth state
  currentTeacher: Teacher | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;

  // Active navigation / view
  currentView: "landing" | "teacher-login" | "teacher-register" | "teacher-dashboard" | "student-portal" | "student-dashboard";
  activeGroupId: string | null;

  // Data collections
  groups: Group[];
  students: Student[];
  categories: Category[];
  grades: Grade[];

  // Active student session (portal)
  activeStudent: Student | null;
  activeStudentGroup: Group | null;
  activeStudentCategories: Category[];
  activeStudentGrades: Grade[];

  // Database mode info
  isFirebaseMode: boolean;

  // Actions
  initialize: () => void;
  setView: (view: DocenteState["currentView"]) => void;
  setActiveGroup: (groupId: string | null) => void;
  clearAuthError: () => void;
  loadLocalData: (teacherId: string) => void;
  saveLocalData: () => void;
  subscribeToTeacherData: (teacherId: string) => void;
  subscribeToGroupsSubData: (groupIds: string[]) => void;

  // Teacher Auth Actions
  loginTeacher: (email: string, password: string) => Promise<boolean>;
  registerTeacher: (name: string, email: string, password: string) => Promise<boolean>;
  logoutTeacher: () => Promise<void>;

  // Group CRUD
  createGroup: (name: string, schoolYear: string) => Promise<void>;
  updateGroup: (groupId: string, name: string, schoolYear: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Student CRUD & Import
  importStudents: (groupId: string, studentsToImport: { name: string; matricula: string }[]) => Promise<Student[]>;
  deleteStudent: (studentId: string) => Promise<void>;

  // Category CRUD
  createCategory: (groupId: string, name: string, percentage: number) => Promise<void>;
  updateCategory: (categoryId: string, name: string, percentage: number) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  // Grade CRUD
  saveGrade: (studentId: string, categoryId: string, activityName: string, score: number) => Promise<void>;
  deleteGrade: (gradeId: string) => Promise<void>;

  // Student Portal Actions
  accessStudentPortal: (matricula: string, accessCode: string) => Promise<{ success: boolean; error?: string }>;
  logoutStudent: () => void;
  subscribeToStudentData: (studentId: string, groupId: string) => void;
}

// Helper to generate access code
export function generateAccessCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate uuid
export function generateUUID(): string {
  return "std_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now().toString(36);
}

// Active Firestore listener unsubscribe references
let authUnsubscribe: (() => void) | null = null;
let groupsUnsubscribe: (() => void) | null = null;
let studentsUnsubscribe: (() => void) | null = null;
let categoriesUnsubscribe: (() => void) | null = null;
let gradesUnsubscribe: (() => void) | null = null;
let studentPortalUnsubscribers: (() => void)[] = [];
let lastSubscribedGroupIds: string[] = [];

const arraysAreEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

const clearTeacherSubscriptions = () => {
  if (groupsUnsubscribe) {
    groupsUnsubscribe();
    groupsUnsubscribe = null;
  }
  if (studentsUnsubscribe) {
    studentsUnsubscribe();
    studentsUnsubscribe = null;
  }
  if (categoriesUnsubscribe) {
    categoriesUnsubscribe();
    categoriesUnsubscribe = null;
  }
  if (gradesUnsubscribe) {
    gradesUnsubscribe();
    gradesUnsubscribe = null;
  }
};

const clearStudentPortalSubscriptions = () => {
  studentPortalUnsubscribers.forEach((unsub) => unsub());
  studentPortalUnsubscribers = [];
};

export const useDocenteStore = create<DocenteState>((set, get) => ({
  currentTeacher: null,
  isAuthenticated: false,
  authLoading: true,
  authError: null,

  currentView: "landing",
  activeGroupId: null,

  groups: [],
  students: [],
  categories: [],
  grades: [],

  activeStudent: null,
  activeStudentGroup: null,
  activeStudentCategories: [],
  activeStudentGrades: [],

  isFirebaseMode: !isLocalStorageFallback,

  initialize: () => {
    // Listen to Firebase Auth state if configured
    if (!isLocalStorageFallback && auth) {
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // Fetch teacher name from Firestore or default to email name
            const teacherDoc = await getDoc(doc(db, "teachers", firebaseUser.uid));
            let teacherName = firebaseUser.displayName || "Profesor";
            if (teacherDoc.exists()) {
              teacherName = teacherDoc.data().name;
            }

            const teacher: Teacher = {
              uid: firebaseUser.uid,
              name: teacherName,
              email: firebaseUser.email || "",
            };

            set({
              currentTeacher: teacher,
              isAuthenticated: true,
              authLoading: false,
              currentView: get().currentView === "landing" || get().currentView === "teacher-login" || get().currentView === "teacher-register"
                ? "teacher-dashboard"
                : get().currentView,
            });

            // Fetch live data for teacher
            get().subscribeToTeacherData(firebaseUser.uid);
          } catch (err) {
            console.error("Error loading teacher info:", err);
            set({ authLoading: false });
          }
        } else {
          set({
            currentTeacher: null,
            isAuthenticated: false,
            authLoading: false,
            groups: [],
            students: [],
            categories: [],
            grades: [],
          });
        }
      });
      authUnsubscribe = unsub;
    } else {
      // Local storage fallback initialization
      const localTeacher = localStorage.getItem("docente_current_teacher");
      if (localTeacher) {
        const teacher = JSON.parse(localTeacher);
        set({
          currentTeacher: teacher,
          isAuthenticated: true,
          authLoading: false,
          currentView: get().currentView === "landing" || get().currentView === "teacher-login"
            ? "teacher-dashboard"
            : get().currentView,
        });
        get().loadLocalData(teacher.uid);
      } else {
        set({ authLoading: false });
      }
    }
  },

  setView: (view) => set({ currentView: view }),

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

  clearAuthError: () => set({ authError: null }),

  // Load from local storage for offline fallback
  loadLocalData: (teacherId: string) => {
    const localGroups = localStorage.getItem(`docente_groups_${teacherId}`) || "[]";
    const localStudents = localStorage.getItem(`docente_students_${teacherId}`) || "[]";
    const localCategories = localStorage.getItem(`docente_categories_${teacherId}`) || "[]";
    const localGrades = localStorage.getItem(`docente_grades_${teacherId}`) || "[]";

    set({
      groups: JSON.parse(localGroups),
      students: JSON.parse(localStudents),
      categories: JSON.parse(localCategories),
      grades: JSON.parse(localGrades),
    });
  },

  saveLocalData: () => {
    const teacher = get().currentTeacher;
    if (!teacher) return;
    const { groups, students, categories, grades } = get();
    localStorage.setItem(`docente_groups_${teacher.uid}`, JSON.stringify(groups));
    localStorage.setItem(`docente_students_${teacher.uid}`, JSON.stringify(students));
    localStorage.setItem(`docente_categories_${teacher.uid}`, JSON.stringify(categories));
    localStorage.setItem(`docente_grades_${teacher.uid}`, JSON.stringify(grades));
  },

  // Real-time Firestore subscriptions for Teacher
  subscribeToTeacherData: (teacherId: string) => {
    if (isLocalStorageFallback || !db) return;

    // Clear existing subs
    clearTeacherSubscriptions();
    lastSubscribedGroupIds = [];

    try {
      // 1. Subscribe to Groups
      const groupsQuery = query(collection(db, "groups"), where("teacherId", "==", teacherId));
      groupsUnsubscribe = onSnapshot(groupsQuery, (snapshot) => {
        const groupsList: Group[] = [];
        snapshot.forEach((d) => {
          groupsList.push({ id: d.id, ...d.data() } as Group);
        });
        set({ groups: groupsList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });

        // Subscribe to items belonging to these groups
        const groupIds = groupsList.map((g) => g.id);
        if (groupIds.length > 0) {
          get().subscribeToGroupsSubData(groupIds);
        } else {
          set({ students: [], categories: [], grades: [] });
          if (studentsUnsubscribe) { studentsUnsubscribe(); studentsUnsubscribe = null; }
          if (categoriesUnsubscribe) { categoriesUnsubscribe(); categoriesUnsubscribe = null; }
          if (gradesUnsubscribe) { gradesUnsubscribe(); gradesUnsubscribe = null; }
          lastSubscribedGroupIds = [];
        }
      }, (error) => {
        console.error("Error subscribing to groups:", error);
      });
    } catch (err) {
      console.error("Failed to setup subscriptions:", err);
    }
  },

  subscribeToGroupsSubData: (groupIds: string[]) => {
    if (isLocalStorageFallback || !db) return;

    // Avoid redundant calls and infinite loop updates
    if (arraysAreEqual(lastSubscribedGroupIds, groupIds)) {
      return;
    }

    // Clean up previous sub-data listeners first
    if (studentsUnsubscribe) {
      studentsUnsubscribe();
      studentsUnsubscribe = null;
    }
    if (categoriesUnsubscribe) {
      categoriesUnsubscribe();
      categoriesUnsubscribe = null;
    }
    if (gradesUnsubscribe) {
      gradesUnsubscribe();
      gradesUnsubscribe = null;
    }

    lastSubscribedGroupIds = [...groupIds];

    try {
      // We do real-time onSnapshot for students, categories, and grades
      // 2. Subscribe to Students
      const studentsQuery = query(collection(db, "students"), where("groupId", "in", groupIds));
      studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
        const studentsList: Student[] = [];
        snapshot.forEach((d) => {
          studentsList.push({ id: d.id, ...d.data() } as Student);
        });
        set({ students: studentsList });
      }, (error) => {
        console.error("Error subscribing to students:", error);
      });

      // 3. Subscribe to Categories
      const categoriesQuery = query(collection(db, "categories"), where("groupId", "in", groupIds));
      categoriesUnsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
        const categoriesList: Category[] = [];
        snapshot.forEach((d) => {
          categoriesList.push({ id: d.id, ...d.data() } as Category);
        });
        set({ categories: categoriesList });
      }, (error) => {
        console.error("Error subscribing to categories:", error);
      });

      // 4. Subscribe to Grades
      // Let's query all grades.
      gradesUnsubscribe = onSnapshot(collection(db, "grades"), (snapshot) => {
        const gradesList: Grade[] = [];
        snapshot.forEach((d) => {
          gradesList.push({ id: d.id, ...d.data() } as Grade);
        });
        set({ grades: gradesList });
      }, (error) => {
        console.error("Error subscribing to grades:", error);
      });
    } catch (e) {
      console.error("Error subscribing to group subdata:", e);
    }
  },

  // TEACHER AUTH ACTIONS
  loginTeacher: async (email, password) => {
    set({ authLoading: true, authError: null });

    if (!isLocalStorageFallback && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (err: any) {
        let errMsg = "Error al iniciar sesión. Verifique sus datos.";
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
          errMsg = "Correo o contraseña incorrectos.";
        } else if (err.code === "auth/invalid-email") {
          errMsg = "Formato de correo inválido.";
        }
        set({ authError: errMsg, authLoading: false });
        return false;
      }
    } else {
      // Offline fallback: Check local accounts
      const localAccounts = localStorage.getItem("docente_local_teachers") || "[]";
      const accounts: Teacher[] = JSON.parse(localAccounts);
      // Also check credentials (stored in localStorage with prefix)
      const foundTeacher = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      const savedPass = localStorage.getItem(`docente_pass_${email.toLowerCase()}`);

      if (foundTeacher && savedPass === password) {
        set({
          currentTeacher: foundTeacher,
          isAuthenticated: true,
          authLoading: false,
          authError: null,
          currentView: "teacher-dashboard",
        });
        localStorage.setItem("docente_current_teacher", JSON.stringify(foundTeacher));
        get().loadLocalData(foundTeacher.uid);
        return true;
      } else if (email.toLowerCase() === "profe@sistema.com" && password === "123456") {
        // Pre-loaded convenient account
        const preloadedTeacher: Teacher = {
          uid: "teacher_profe_demo",
          name: "Profesor Demo",
          email: "profe@sistema.com",
        };
        accounts.push(preloadedTeacher);
        localStorage.setItem("docente_local_teachers", JSON.stringify(accounts));
        localStorage.setItem(`docente_pass_profe@sistema.com`, "123456");

        set({
          currentTeacher: preloadedTeacher,
          isAuthenticated: true,
          authLoading: false,
          authError: null,
          currentView: "teacher-dashboard",
        });
        localStorage.setItem("docente_current_teacher", JSON.stringify(preloadedTeacher));
        get().loadLocalData(preloadedTeacher.uid);
        return true;
      } else {
        set({ authError: "Correo o contraseña incorrectos.", authLoading: false });
        return false;
      }
    }
  },

  registerTeacher: async (name, email, password) => {
    set({ authLoading: true, authError: null });

    if (!isLocalStorageFallback && auth && db) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Save teacher profile in Firestore
        await setDoc(doc(db, "teachers", uid), {
          uid,
          name,
          email,
        });

        return true;
      } catch (err: any) {
        let errMsg = "Error al registrarse. Intente de nuevo.";
        if (err.code === "auth/email-already-in-use") {
          errMsg = "Este correo electrónico ya está registrado.";
        } else if (err.code === "auth/weak-password") {
          errMsg = "La contraseña debe tener al menos 6 caracteres.";
        } else if (err.code === "auth/invalid-email") {
          errMsg = "Formato de correo inválido.";
        }
        set({ authError: errMsg, authLoading: false });
        return false;
      }
    } else {
      // Local storage fallback
      const localAccounts = localStorage.getItem("docente_local_teachers") || "[]";
      const accounts: Teacher[] = JSON.parse(localAccounts);

      if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase()) || email.toLowerCase() === "profe@sistema.com") {
        set({ authError: "Este correo electrónico ya está registrado.", authLoading: false });
        return false;
      }

      const newTeacher: Teacher = {
        uid: "teacher_" + Math.random().toString(36).substr(2, 9),
        name,
        email,
      };

      accounts.push(newTeacher);
      localStorage.setItem("docente_local_teachers", JSON.stringify(accounts));
      localStorage.setItem(`docente_pass_${email.toLowerCase()}`, password);

      set({
        currentTeacher: newTeacher,
        isAuthenticated: true,
        authLoading: false,
        authError: null,
        currentView: "teacher-dashboard",
      });
      localStorage.setItem("docente_current_teacher", JSON.stringify(newTeacher));
      get().loadLocalData(newTeacher.uid);
      return true;
    }
  },

  logoutTeacher: async () => {
    // Unsubscribe all
    clearTeacherSubscriptions();
    lastSubscribedGroupIds = [];

    if (!isLocalStorageFallback && auth) {
      await firebaseSignOut(auth);
    } else {
      localStorage.removeItem("docente_current_teacher");
    }

    set({
      currentTeacher: null,
      isAuthenticated: false,
      groups: [],
      students: [],
      categories: [],
      grades: [],
      activeGroupId: null,
      currentView: "landing",
    });
  },

  // GROUP CRUD
  createGroup: async (name, schoolYear) => {
    const teacher = get().currentTeacher;
    if (!teacher) return;

    const id = generateUUID();
    const newGroup: Group = {
      id,
      teacherId: teacher.uid,
      name,
      schoolYear,
      createdAt: new Date().toISOString(),
    };

    if (!isLocalStorageFallback && db) {
      try {
        await setDoc(doc(db, "groups", id), newGroup);
      } catch (e) {
        console.error("Error creating group in Firestore:", e);
      }
    } else {
      set((state) => {
        const updated = [newGroup, ...state.groups];
        setTimeout(() => get().saveLocalData(), 0);
        return { groups: updated };
      });
    }
  },

  updateGroup: async (groupId, name, schoolYear) => {
    if (!isLocalStorageFallback && db) {
      try {
        await setDoc(doc(db, "groups", groupId), { name, schoolYear }, { merge: true });
      } catch (e) {
        console.error("Error updating group in Firestore:", e);
      }
    } else {
      set((state) => {
        const updated = state.groups.map((g) =>
          g.id === groupId ? { ...g, name, schoolYear } : g
        );
        setTimeout(() => get().saveLocalData(), 0);
        return { groups: updated };
      });
    }
  },

  deleteGroup: async (groupId) => {
    if (!isLocalStorageFallback && db) {
      try {
        // Delete group document
        await deleteDoc(doc(db, "groups", groupId));
        // Students, categories, grades will be kept or deleted. The instructions ask us to keep it simple, but let's delete them from store manually.
      } catch (e) {
        console.error("Error deleting group from Firestore:", e);
      }
    } else {
      set((state) => {
        const updatedGroups = state.groups.filter((g) => g.id !== groupId);
        const updatedStudents = state.students.filter((s) => s.groupId !== groupId);
        const updatedCategories = state.categories.filter((c) => c.groupId !== groupId);
        // Clean up grades for deleted students
        const studentIds = state.students.filter((s) => s.groupId === groupId).map((s) => s.id);
        const updatedGrades = state.grades.filter((g) => !studentIds.includes(g.studentId));

        setTimeout(() => {
          get().saveLocalData();
        }, 0);

        return {
          groups: updatedGroups,
          students: updatedStudents,
          categories: updatedCategories,
          grades: updatedGrades,
          activeGroupId: state.activeGroupId === groupId ? null : state.activeGroupId,
        };
      });
    }
  },

  // STUDENT CRUD & IMPORT
  importStudents: async (groupId, studentsToImport) => {
    const importedList: Student[] = studentsToImport.map((stu) => ({
      id: generateUUID(),
      groupId,
      name: stu.name,
      matricula: stu.matricula.trim(),
      accessCode: generateAccessCode(),
      active: true,
      createdAt: new Date().toISOString(),
    }));

    if (!isLocalStorageFallback && db) {
      try {
        const batch = writeBatch(db);
        importedList.forEach((student) => {
          batch.set(doc(db, "students", student.id), student);
        });
        await batch.commit();
      } catch (e) {
        console.error("Error importing students in Firestore batch:", e);
      }
    } else {
      set((state) => {
        const updated = [...state.students, ...importedList];
        setTimeout(() => get().saveLocalData(), 0);
        return { students: updated };
      });
    }

    return importedList;
  },

  deleteStudent: async (studentId) => {
    if (!isLocalStorageFallback && db) {
      try {
        await deleteDoc(doc(db, "students", studentId));
        // Also delete student's grades
        const q = query(collection(db, "grades"), where("studentId", "==", studentId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach((d) => {
          batch.delete(doc(db, "grades", d.id));
        });
        await batch.commit();
      } catch (e) {
        console.error("Error deleting student:", e);
      }
    } else {
      set((state) => {
        const updatedStudents = state.students.filter((s) => s.id !== studentId);
        const updatedGrades = state.grades.filter((g) => g.studentId !== studentId);
        setTimeout(() => get().saveLocalData(), 0);
        return {
          students: updatedStudents,
          grades: updatedGrades,
        };
      });
    }
  },

  // CATEGORY CRUD
  createCategory: async (groupId, name, percentage) => {
    const id = generateUUID();
    const newCat: Category = {
      id,
      groupId,
      name,
      percentage,
    };

    if (!isLocalStorageFallback && db) {
      try {
        await setDoc(doc(db, "categories", id), newCat);
      } catch (e) {
        console.error("Error creating category:", e);
      }
    } else {
      set((state) => {
        const updated = [...state.categories, newCat];
        setTimeout(() => get().saveLocalData(), 0);
        return { categories: updated };
      });
    }
  },

  updateCategory: async (categoryId, name, percentage) => {
    if (!isLocalStorageFallback && db) {
      try {
        await setDoc(doc(db, "categories", categoryId), { name, percentage }, { merge: true });
      } catch (e) {
        console.error("Error updating category:", e);
      }
    } else {
      set((state) => {
        const updated = state.categories.map((c) =>
          c.id === categoryId ? { ...c, name, percentage } : c
        );
        setTimeout(() => get().saveLocalData(), 0);
        return { categories: updated };
      });
    }
  },

  deleteCategory: async (categoryId) => {
    if (!isLocalStorageFallback && db) {
      try {
        await deleteDoc(doc(db, "categories", categoryId));
        // Clean up grades for this category
        const q = query(collection(db, "grades"), where("categoryId", "==", categoryId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach((d) => {
          batch.delete(doc(db, "grades", d.id));
        });
        await batch.commit();
      } catch (e) {
        console.error("Error deleting category:", e);
      }
    } else {
      set((state) => {
        const updatedCats = state.categories.filter((c) => c.id !== categoryId);
        const updatedGrades = state.grades.filter((g) => g.categoryId !== categoryId);
        setTimeout(() => get().saveLocalData(), 0);
        return {
          categories: updatedCats,
          grades: updatedGrades,
        };
      });
    }
  },

  // GRADE CRUD
  saveGrade: async (studentId, categoryId, activityName, score) => {
    // Generate an ID based on student, category and activityName to make it unique or overwrite
    // Under the requested flow, "Capturar calificaciones" usually overwrites if we select the exact same activity, or we can add a new record.
    // Let's check if there is an existing grade for this student, category, and activity. If so, overwrite. Otherwise add.
    const existingGrade = get().grades.find(
      (g) => g.studentId === studentId && g.categoryId === categoryId && g.activityName.trim().toLowerCase() === activityName.trim().toLowerCase()
    );

    const gradeId = existingGrade ? existingGrade.id : generateUUID();
    const gradeObj: Grade = {
      id: gradeId,
      studentId,
      categoryId,
      activityName: activityName.trim(),
      grade: score,
      date: new Date().toLocaleDateString("es-MX") || new Date().toISOString().split("T")[0],
    };

    if (!isLocalStorageFallback && db) {
      try {
        await setDoc(doc(db, "grades", gradeId), gradeObj);
      } catch (e) {
        console.error("Error saving grade:", e);
      }
    } else {
      set((state) => {
        let updated;
        if (existingGrade) {
          updated = state.grades.map((g) => (g.id === gradeId ? gradeObj : g));
        } else {
          updated = [...state.grades, gradeObj];
        }
        setTimeout(() => get().saveLocalData(), 0);
        return { grades: updated };
      });
    }
  },

  deleteGrade: async (gradeId) => {
    if (!isLocalStorageFallback && db) {
      try {
        await deleteDoc(doc(db, "grades", gradeId));
      } catch (e) {
        console.error("Error deleting grade:", e);
      }
    } else {
      set((state) => {
        const updated = state.grades.filter((g) => g.id !== gradeId);
        setTimeout(() => get().saveLocalData(), 0);
        return { grades: updated };
      });
    }
  },

  // STUDENT PORTAL ACTIONS
  accessStudentPortal: async (matricula, accessCode) => {
    const trimmedMatricula = matricula.trim();
    const trimmedCode = accessCode.trim();

    if (!isLocalStorageFallback && db) {
      try {
        // Query student where matricula == trimmedMatricula
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("matricula", "==", trimmedMatricula));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return { success: false, error: "Matrícula o código de acceso incorrectos." };
        }

        let matchedStudent: Student | null = null;
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Student;
          if (data.accessCode === trimmedCode) {
            matchedStudent = { id: doc.id, ...data };
          }
        });

        if (!matchedStudent) {
          return { success: false, error: "Matrícula o código de acceso incorrectos." };
        }

        // Student matches! Load group info
        const student: Student = matchedStudent;
        const groupDoc = await getDoc(doc(db, "groups", student.groupId));
        const group = groupDoc.exists() ? ({ id: groupDoc.id, ...groupDoc.data() } as Group) : null;

        set({
          activeStudent: student,
          activeStudentGroup: group,
          currentView: "student-dashboard",
        });

        // Set up real-time listener for this student's categories and grades
        get().subscribeToStudentData(student.id, student.groupId);

        return { success: true };
      } catch (err) {
        console.error("Error in student login:", err);
        return { success: false, error: "Ocurrió un error al intentar ingresar al portal." };
      }
    } else {
      // Local fallback lookup
      // Check in all local students (across all teacher IDs, we can inspect all docente_students_* in localStorage)
      let allLocalStudents: Student[] = [];
      let allLocalGroups: Group[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("docente_students_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            allLocalStudents = [...allLocalStudents, ...data];
          } catch (e) {}
        }
        if (key && key.startsWith("docente_groups_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            allLocalGroups = [...allLocalGroups, ...data];
          } catch (e) {}
        }
      }

      // Find matched student
      const matchedStudent = allLocalStudents.find(
        (s) => s.matricula === trimmedMatricula && s.accessCode === trimmedCode
      );

      if (!matchedStudent) {
        return { success: false, error: "Matrícula o código de acceso incorrectos." };
      }

      const matchedGroup = allLocalGroups.find((g) => g.id === matchedStudent.groupId) || null;

      // Also grab teacherId to get categories and grades
      let studentCats: Category[] = [];
      let studentGrades: Grade[] = [];

      if (matchedGroup) {
        const teacherId = matchedGroup.teacherId;
        const localCats = JSON.parse(localStorage.getItem(`docente_categories_${teacherId}`) || "[]");
        const localGrades = JSON.parse(localStorage.getItem(`docente_grades_${teacherId}`) || "[]");

        studentCats = localCats.filter((c: Category) => c.groupId === matchedStudent.groupId);
        studentGrades = localGrades.filter((g: Grade) => g.studentId === matchedStudent.id);
      }

      set({
        activeStudent: matchedStudent,
        activeStudentGroup: matchedGroup,
        activeStudentCategories: studentCats,
        activeStudentGrades: studentGrades,
        currentView: "student-dashboard",
      });

      return { success: true };
    }
  },

  logoutStudent: () => {
    clearStudentPortalSubscriptions();
    set({
      activeStudent: null,
      activeStudentGroup: null,
      activeStudentCategories: [],
      activeStudentGrades: [],
      currentView: "landing",
    });
  },

  // Subscribe to updates for student
  subscribeToStudentData: (studentId, groupId) => {
    if (isLocalStorageFallback || !db) return;

    // Clear existing student listeners
    clearStudentPortalSubscriptions();
    clearTeacherSubscriptions(); // Clear teacher subscriptions just in case
    lastSubscribedGroupIds = [];

    try {
      // 1. Subscribe to Categories for student's group
      const catsQuery = query(collection(db, "categories"), where("groupId", "==", groupId));
      const unsubCats = onSnapshot(catsQuery, (snapshot) => {
        const cats: Category[] = [];
        snapshot.forEach((doc) => {
          cats.push({ id: doc.id, ...doc.data() } as Category);
        });
        set({ activeStudentCategories: cats });
      });

      // 2. Subscribe to Grades for this student
      const gradesQuery = query(collection(db, "grades"), where("studentId", "==", studentId));
      const unsubGrades = onSnapshot(gradesQuery, (snapshot) => {
        const gradesList: Grade[] = [];
        snapshot.forEach((doc) => {
          gradesList.push({ id: doc.id, ...doc.data() } as Grade);
        });
        set({ activeStudentGrades: gradesList });
      });

      studentPortalUnsubscribers.push(unsubCats, unsubGrades);
    } catch (e) {
      console.error("Error subscribing to student portal data:", e);
    }
  },
}));
