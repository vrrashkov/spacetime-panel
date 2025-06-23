import * as GeneratedModule from "@/generated";

export class ModuleDiscovery {
  findTableHandles(): string[] {
    return Object.keys(GeneratedModule).filter(
      (key) =>
        key.endsWith("TableHandle") &&
        typeof (GeneratedModule as any)[key] === "function"
    );
  }

  findTableTypes(): string[] {
    return this.findTableHandles()
      .map((handle) => handle.replace("TableHandle", ""))
      .filter((typeName) => {
        const type = (GeneratedModule as any)[typeName];
        return type && typeof type.getTypeScriptAlgebraicType === "function";
      });
  }

  findReducerTypes(): string[] {
    const remoteReducers = (GeneratedModule as any).RemoteReducers;

    if (!remoteReducers?.prototype) {
      return [];
    }

    const methodNames = Object.getOwnPropertyNames(
      remoteReducers.prototype
    ).filter(
      (name) =>
        name !== "constructor" &&
        typeof remoteReducers.prototype[name] === "function" &&
        !name.startsWith("on") &&
        !name.startsWith("removeOn")
    );

    return methodNames.map(this.methodNameToTypeName).filter((typeName) => {
      const type = (GeneratedModule as any)[typeName];
      return type && typeof type.getTypeScriptAlgebraicType === "function";
    });
  }

  private methodNameToTypeName(methodName: string): string {
    return methodName.charAt(0).toUpperCase() + methodName.slice(1);
  }
}
