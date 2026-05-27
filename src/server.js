"use strict";

import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";

import { config } from "./config.js";
import { createDashboardDocument } from "./dashboard.js";
import { paths } from "./paths.js";
import { renderKindleImage } from "./render.js";
import { loadWeatherPayload } from "./weather.js";

const createInitialServerState = () => {
	return {
		activeRenderTrigger: null,
		isRendering: false,
		lastRenderAttemptedAt: null,
		lastRenderDurationMs: null,
		lastRenderError: null,
		lastRenderSkippedAt: null,
		lastRenderSkippedReason: null,
		lastRenderSucceededAt: null,
		lastRenderTrigger: null,
		lastWeatherUpdatedAt: null,
		nextScheduledRenderAt: null,
		serviceStartedAt: new Date().toISOString(),
	};
};

const serverState = createInitialServerState();

const toErrorMessage = ( error ) => {
	if ( error instanceof Error && error.message ) {
		return error.message;
	}

	return String( error );
};

const sendJson = ( res, statusCode, payload ) => {
	res.writeHead( statusCode, {
		"cache-control": "no-store",
		"content-type": "application/json",
	} );
	res.end( JSON.stringify( payload ) );
};

const imageNoCacheHeaders = {
	"cache-control": "no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate",
	"expires": "0",
	"pragma": "no-cache",
	"surrogate-control": "no-store",
};

const getDashboardOrientation = ( requestUrl ) => {
	const orientation = requestUrl.searchParams.get( "orientation" );

	if ( orientation === "landscape" || orientation === "portrait" ) {
		return orientation;
	}

	return config.renderOrientation;
};

const parseTimestampMs = ( value ) => {
	if ( !value ) {
		return null;
	}

	const timestampMs = Date.parse( value );

	return Number.isFinite( timestampMs ) ? timestampMs : null;
};

const createImageStaleMetadata = ( updatedAt ) => {
	const updatedAtMs = parseTimestampMs( updatedAt );

	if ( updatedAtMs === null ) {
		return {
			ageMs: null,
			isStale: true,
			staleAfterMs: config.renderStaleAfterMs,
		};
	}

	const ageMs = Math.max( 0, Date.now() - updatedAtMs );

	return {
		ageMs,
		isStale: ageMs >= config.renderStaleAfterMs,
		staleAfterMs: config.renderStaleAfterMs,
	};
};

const getOutputFileStatus = async () => {
	try {
		const fileInfo = await stat( paths.outputPath );
		const updatedAt = fileInfo.mtime.toISOString();

		return {
			...createImageStaleMetadata( updatedAt ),
			exists: true,
			size: fileInfo.size,
			updatedAt,
			version: Math.trunc( fileInfo.mtimeMs ),
		};
	} catch {
		return {
			...createImageStaleMetadata( null ),
			exists: false,
			size: null,
			updatedAt: null,
			version: null,
		};
	}
};

const getLatestImageUrl = ( outputFileStatus ) => {
	if ( !outputFileStatus.version ) {
		return "/kindle/latest.png";
	}

	return `/kindle/latest-${ outputFileStatus.version }.png`;
};

const getLatestImageRedirectUrl = () => {
	return "/kindle/latest.png?redirect=1";
};

const getLatestImageHeaders = ( fileInfo ) => {
	const imageVersion = `${ Math.trunc( fileInfo.mtimeMs ) }-${ fileInfo.size }`;

	return {
		...imageNoCacheHeaders,
		"content-length": fileInfo.size,
		"content-type": "image/png",
		"etag": `"${ imageVersion }"`,
		"last-modified": fileInfo.mtime.toUTCString(),
	};
};

const isLatestImagePath = ( pathname ) => {
	return pathname === "/kindle/latest.png" || /^\/kindle\/latest-\d+\.png$/.test( pathname );
};

const shouldRedirectToVersionedImage = ( requestUrl ) => {
	return requestUrl.pathname === "/kindle/latest.png" && requestUrl.searchParams.get( "redirect" ) === "1";
};

const getStartupState = ( outputFileStatus ) => {
	if ( outputFileStatus.exists ) {
		return "ready";
	}

	if ( serverState.isRendering && serverState.activeRenderTrigger === "startup" ) {
		return "warming";
	}

	if ( serverState.lastRenderError ) {
		return "degraded";
	}

	return "warming";
};

const getServiceStatus = async () => {
	const outputFileStatus = await getOutputFileStatus();

	return {
		image: {
			...outputFileStatus,
			redirectUrl: getLatestImageRedirectUrl(),
			url: getLatestImageUrl( outputFileStatus ),
		},
		ok: true,
		render: {
			activeTrigger: serverState.activeRenderTrigger,
			isRendering: serverState.isRendering,
			lastAttemptedAt: serverState.lastRenderAttemptedAt,
			lastDurationMs: serverState.lastRenderDurationMs,
			lastError: serverState.lastRenderError,
			lastSkippedAt: serverState.lastRenderSkippedAt,
			lastSkippedReason: serverState.lastRenderSkippedReason,
			lastSucceededAt: serverState.lastRenderSucceededAt,
			lastTrigger: serverState.lastRenderTrigger,
			lastWeatherUpdatedAt: serverState.lastWeatherUpdatedAt,
		},
		scheduler: {
			intervalMs: config.renderIntervalMs,
			nextRenderAt: serverState.nextScheduledRenderAt,
		},
		startup: {
			serviceStartedAt: serverState.serviceStartedAt,
			state: getStartupState( outputFileStatus ),
		},
		ui: {
			renderHeight: config.renderHeight,
			renderOrientation: config.renderOrientation,
			temperatureUnit: config.temperatureUnit,
			renderWidth: config.renderWidth,
		},
		output: {
			normalize: config.outputNormalize,
			sharpenSigma: config.outputSharpenSigma,
		},
		weatherSource: config.weatherSource,
	};
};

const initializeServiceState = async () => {
	await mkdir( paths.outputDirectoryPath, { recursive: true } );

	const outputFileStatus = await getOutputFileStatus();

	if ( outputFileStatus.updatedAt && !serverState.lastRenderSucceededAt ) {
		serverState.lastRenderSucceededAt = outputFileStatus.updatedAt;
	}

	return outputFileStatus;
};

const scheduleNextRender = () => {
	serverState.nextScheduledRenderAt = new Date(
		Date.now() + config.renderIntervalMs
	).toISOString();
};

const renderOnce = async ( trigger ) => {
	if ( serverState.isRendering ) {
		serverState.lastRenderSkippedAt = new Date().toISOString();
		serverState.lastRenderSkippedReason = "render-in-progress";

		return {
			reason: "render-in-progress",
			skipped: true,
		};
	}

	const renderStartedAt = Date.now();

	serverState.activeRenderTrigger = trigger;
	serverState.isRendering = true;
	serverState.lastRenderAttemptedAt = new Date().toISOString();
	serverState.lastRenderSkippedAt = null;
	serverState.lastRenderSkippedReason = null;

	try {
		const renderResult = await renderKindleImage();

		serverState.lastRenderError = null;
		serverState.lastRenderSucceededAt = new Date().toISOString();
		serverState.lastRenderTrigger = trigger;
		serverState.lastWeatherUpdatedAt = renderResult.weatherUpdatedAt;

		return {
			...renderResult,
			trigger,
			skipped: false,
		};
	} catch ( error ) {
		serverState.lastRenderError = toErrorMessage( error );
		serverState.lastRenderTrigger = trigger;
		throw error;
	} finally {
		serverState.activeRenderTrigger = null;
		serverState.isRendering = false;
		serverState.lastRenderDurationMs = Date.now() - renderStartedAt;
	}
};

const startScheduledRendering = () => {
	scheduleNextRender();

	setInterval( () => {
		scheduleNextRender();

		void renderOnce( "schedule" ).catch( ( error ) => {
			console.error( "Scheduled render failed:", error );
		} );
	}, config.renderIntervalMs );
};

const startInitialRenderIfNeeded = ( outputFileStatus ) => {
	if ( outputFileStatus.exists && !outputFileStatus.isStale ) {
		return;
	}

	void renderOnce( "startup" ).catch( ( error ) => {
		console.error( "Startup render failed:", error );
	} );
};

const renderDashboardResponse = async ( requestUrl, res ) => {
	try {
		const weatherPayload = await loadWeatherPayload();
		const htmlDocument = createDashboardDocument( weatherPayload, {
			orientation: getDashboardOrientation( requestUrl ),
		} );

		res.writeHead( 200, {
			"cache-control": "no-store",
			"content-type": "text/html; charset=utf-8",
		} );
		res.end( htmlDocument );
	} catch ( error ) {
		sendJson( res, 500, {
			error: toErrorMessage( error ),
			ok: false,
		} );
	}
};

const renderHealthResponse = async ( res ) => {
	const serviceStatus = await getServiceStatus();

	sendJson( res, 200, {
		hasImage: serviceStatus.image.exists,
		isRendering: serviceStatus.render.isRendering,
		isStale: serviceStatus.image.isStale,
		ok: true,
		startupState: serviceStatus.startup.state,
	} );
};

const renderLatestImageResponse = async ( requestUrl, res ) => {
	try {
		const fileInfo = await stat( paths.outputPath );

		if ( shouldRedirectToVersionedImage( requestUrl ) ) {
			res.writeHead( 302, {
				...imageNoCacheHeaders,
				location: getLatestImageUrl( {
					version: Math.trunc( fileInfo.mtimeMs ),
				} ),
			} );
			res.end();
			return;
		}

		res.writeHead( 200, getLatestImageHeaders( fileInfo ) );

		createReadStream( paths.outputPath ).pipe( res );
	} catch {
		res.writeHead( 404 );
		res.end( "Not found" );
	}
};

const renderStatusResponse = async ( res ) => {
	sendJson( res, 200, await getServiceStatus() );
};

const renderTriggerResponse = async ( res ) => {
	try {
		const renderResult = await renderOnce( "manual" );

		sendJson( res, 202, {
			ok: true,
			reason: renderResult.reason || null,
			skipped: renderResult.skipped,
		} );
	} catch ( error ) {
		sendJson( res, 500, {
			error: toErrorMessage( error ),
			ok: false,
		} );
	}
};

const server = http.createServer( async ( req, res ) => {
	if ( !req.url ) {
		res.writeHead( 400 );
		res.end( "Bad request" );

		return;
	}

	const requestUrl = new URL( req.url, "http://localhost" );

	if ( requestUrl.pathname === "/dashboard" ) {
		await renderDashboardResponse( requestUrl, res );
		return;
	}

	if ( requestUrl.pathname === "/healthz" ) {
		await renderHealthResponse( res );
		return;
	}

	if ( isLatestImagePath( requestUrl.pathname ) ) {
		await renderLatestImageResponse( requestUrl, res );
		return;
	}

	if ( requestUrl.pathname === "/render" ) {
		await renderTriggerResponse( res );
		return;
	}

	if ( requestUrl.pathname === "/status" ) {
		await renderStatusResponse( res );
		return;
	}

	res.writeHead( 404 );
	res.end( "Not found" );
} );

const start = async () => {
	const outputFileStatus = await initializeServiceState();

	server.listen( config.port, config.host, () => {
		console.log(
			`Kindle image service listening on http://${ config.host }:${ config.port }`
		);
	} );

	startScheduledRendering();
	startInitialRenderIfNeeded( outputFileStatus );
};

void start();