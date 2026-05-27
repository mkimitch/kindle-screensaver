"use strict";

import { renderKindleImage } from "./render.js";

const run = async () => {
	const { outputPath } = await renderKindleImage();

	console.log( `Rendered Kindle image to ${ outputPath }` );
};

run().catch( ( error ) => {
	console.error( "Kindle render failed:", error );
	process.exitCode = 1;
} );
