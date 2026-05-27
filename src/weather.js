"use strict";

import { readFile } from "node:fs/promises";

import { config } from "./config.js";
import { paths } from "./paths.js";

const ensureWeatherPayload = ( payload ) => {
	if ( !payload || typeof payload !== "object" || Array.isArray( payload ) ) {
		throw new Error( "Weather payload must be an object." );
	}

	return payload;
};

const readFixtureWeatherPayload = async () => {
	const fixtureContent = await readFile( paths.weatherFixturePath, "utf8" );
	const fixturePayload = JSON.parse( fixtureContent );

	return ensureWeatherPayload( fixturePayload );
};

const fetchWeatherPayload = async () => {
	const abortController = new AbortController();
	const timeoutHandle = setTimeout( () => {
		abortController.abort();
	}, config.timeoutMs );

	try {
		const response = await fetch( config.weatherApiUrl, {
			headers: {
				accept: "application/json",
			},
			signal: abortController.signal,
		} );

		if ( !response.ok ) {
			throw new Error(
				`Weather API request failed with status ${ response.status }.`
			);
		}

		const weatherPayload = await response.json();

		return ensureWeatherPayload( weatherPayload );
	} finally {
		clearTimeout( timeoutHandle );
	}
};

export const loadWeatherPayload = async () => {
	if ( config.weatherSource === "fixture" ) {
		return readFixtureWeatherPayload();
	}

	return fetchWeatherPayload();
};
