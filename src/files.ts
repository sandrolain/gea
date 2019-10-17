
export const blobToDataURL = (blob: Blob): Promise<string | ArrayBuffer> => {
  return new Promise((ok, ko): void => {
    const reader = new FileReader();

    reader.onload = (): void => {
      ok(reader.result);
    };

    reader.onerror = (err): void => {
      ko(err);
    };

    reader.readAsDataURL(blob);
  });
};

export const blobToText = (blob: Blob): Promise<string | ArrayBuffer> => {
  return new Promise((ok, ko): void => {
    const reader = new FileReader();

    reader.onload = (): void => {
      ok(reader.result);
    };

    reader.onerror = (err): void => {
      ko(err);
    };

    reader.readAsText(blob);
  });
};

export const dataURLToBlob = (dataURI: string): Promise<Blob> => {
  const type      = dataURI.split(",")[0].split(":")[1].split(";")[0];

  return fetch(dataURI)
    .then(res => res.arrayBuffer())
    .then(buf => new Blob([buf], { type }));
};


export const blobDownload = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const $a  = document.createElement("a");

  $a.href          = url;
  $a.download      = fileName || "noname-file";
  $a.style.display = "none";

  document.body.appendChild($a);

  $a.click();

  window.URL.revokeObjectURL(url);

  document.body.removeChild($a);
};
