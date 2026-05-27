"use strict";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./config.js";

const currentFilePath = fileURLToPath( import.meta.url );
const currentDirectoryPath = dirname( currentFilePath );
const projectRootPath = resolve( currentDirectoryPath, ".." );

const resolveProjectPath = ( targetPath ) => {
	return resolve( projectRootPath, targetPath );
};

const outputPath = resolveProjectPath( config.outputPath );
const tempOutputPath = resolveProjectPath( config.tempOutputPath );

export const paths = {
	outputDirectoryPath: dirname( outputPath ),
	outputPath,
	projectRootPath,
	tempOutputPath,
	weatherFixturePath: resolveProjectPath( config.weatherFixturePath ),
};
