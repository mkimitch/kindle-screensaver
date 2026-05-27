"use strict";

import { copyFile, mkdir, unlink } from "node:fs/promises";

import { chromium } from "playwright";
import sharp from "sharp";

import { config } from "./config.js";
import { createDashboardDocument } from "./dashboard.js";
import { paths } from "./paths.js";
import { loadWeatherPayload } from "./weather.js";

const removeTempOutputFile = async () => {
	try {
		await unlink( paths.tempOutputPath );
	} catch ( error ) {
		if ( error?.code !== "ENOENT" ) {
			throw error;
		}
	}
};

export const renderKindleImage = async () => {
	await mkdir( paths.outputDirectoryPath, { recursive: true } );
	await removeTempOutputFile();

	let browser;

	try {
		const weatherPayload = await loadWeatherPayload();
		const htmlDocument = createDashboardDocument( weatherPayload );

		browser = await chromium.launch( {
			headless: true,
		} );

		const page = await browser.newPage( {
			deviceScaleFactor: 1,
			viewport: {
				height: config.renderHeight,
				width: config.renderWidth,
			},
		} );

		await page.setContent( htmlDocument, {
			waitUntil: "load",
		} );

		const screenshotBuffer = await page.screenshot( {
			fullPage: false,
			type: "png",
		} );

		let imagePipeline = sharp( screenshotBuffer )
			.flatten( { background: "#ffffff" } )
			.grayscale();

		if ( config.renderOrientation === "landscape" ) {
			imagePipeline = imagePipeline.rotate( 90 );
		}

		if ( config.outputNormalize ) {
			imagePipeline = imagePipeline.normalize();
		}

		if ( config.outputSharpenSigma ) {
			imagePipeline = imagePipeline.sharpen( {
				sigma: config.outputSharpenSigma,
			} );
		}

		await imagePipeline.png().toFile( paths.tempOutputPath );

		await copyFile( paths.tempOutputPath, paths.outputPath );
		await removeTempOutputFile();

		return {
			outputPath: paths.outputPath,
			weatherUpdatedAt: weatherPayload?.updatedAt || weatherPayload?.current?.time || null,
		};
	} catch ( error ) {
		await removeTempOutputFile();
		throw error;
	} finally {
		if ( browser ) {
			await browser.close();
		}
	}
};