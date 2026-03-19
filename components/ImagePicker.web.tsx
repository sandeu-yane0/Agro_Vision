export const pickImage = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // Crée une URL locale pour l'image
        const imageUrl = URL.createObjectURL(file);
        resolve(imageUrl);
      } else {
        resolve(null);
      }
      // Nettoyage
      input.remove();
    };

    input.oncancel = () => {
      resolve(null);
      input.remove();
    };

    input.click();
  });
};
