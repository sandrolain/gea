

export const blobToDataURL = (blob) =>
{
	return new Promise((ok, ko) =>
	{
		const reader = new FileReader();

		reader.onload = () =>
		{
			ok(reader.result);
		};

		reader.onerror = (err) =>
		{
			ko(err);
		};

		reader.readAsDataURL(blob);
	});
};

export const blobToText = (blob) =>
{
	return new Promise((ok, ko) =>
	{
		const reader = new FileReader();

		reader.onload = () =>
		{
			ok(reader.result);
		};

		reader.onerror = (err) =>
		{
			ko(err);
		};

		reader.readAsText(blob);
	});
};


export const dataURLToBlob = (dataURI) =>
{
	const type			= dataURI.split(",")[0].split(":")[1].split(";")[0];

	return fetch(dataURI)
        .then(res => res.arrayBuffer())
        .then(buf => new Blob([buf], {type}));
}


export const blobDownload = (blob, fileName) =>
{
	const url = window.URL.createObjectURL(blob);

	const $a = document.createElement("a");

	$a.href		= url;
	$a.download	= fileName || "noname-file";
	$a.style.display = "none";

    document.body.appendChild($a);

	$a.click();

	window.URL.revokeObjectURL(url);

	document.body.removeChild($a);
};
