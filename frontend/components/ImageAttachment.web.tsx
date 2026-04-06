/**
 * Version Web du sélecteur d'image.
 * Utilise un input file HTML pour ouvrir le sélecteur de fichiers natif.
 * Retourne une ObjectURL de l'image sélectionnée, ou null si annulé.
 */
export function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        resolve(objectUrl);
      } else {
        resolve(null);
      }
    };

    input.oncancel = () => resolve(null);

    // Déclencher l'ouverture du sélecteur de fichier
    input.click();
  });
}
