interface ImportMetaEnv {
  readonly VITE_GEOCODER_URL?: string;
  /** Origin of the city's open data services. Defaults to the dev/preview proxy at "/ogd". */
  readonly VITE_OGD_BASE_URL?: string;
}
