cmake_minimum_required(VERSION 3.1.0 FATAL_ERROR)
project(verifi_analysis)

set(CMAKE_VERSION_MAJOR 0)
set(CMAKE_VERSION_MINOR 3)
set(CMAKE_VERSION_PATCH 1)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "-fexceptions -O3 -std=c++11")
# set(CMAKE_EXE_LINKER_FLAGS "--no-entry --bind -s WASM=1 -s ASSERTIONS=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s STANDALONE_WASM")
set(CMAKE_EXE_LINKER_FLAGS "--no-entry --bind -s WASM=1 -s ASSERTIONS=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s STANDALONE_WASM")


set(EXECUTABLE_OUTPUT_PATH ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

# set(CMAKE_DATABASE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
# set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR})

set(SOURCE_FILES
  src/MonthlyAnalysisCalculatedValues.cpp
  src/MonthlyAnalysisSummary.cpp
  src/MonthlyAnalysisSummaryData.cpp
  src/MonthlyGroupAnalysis.cpp
  src/AnnualAnalysisSummary.cpp
  src/AnnualAnalysisSummaryData.cpp
  src/MonthlyFacilityAnalysis.cpp
  src/MonthlyFacilityAnalysisData.cpp)

set(SOURCE_FILES_WASM
  bindings/AnalysisSummaryWASM.cpp)

set(INCLUDE_FILES
  include/MonthlyAnalysisCalculatedValues.h
  include/MonthlyAnalysisSummary.h
  include/MonthlyAnalysisSummaryData.h
  include/MonthlyGroupAnalysis.h
  include/AnalysisGroup.h
  include/CalanderizedMeter.h
  include/AnalysisDate.h
  include/Facility.h
  include/Helper.h
  include/MonthlyData.h
  include/PredictorEntry.h
  include/AnnualAnalysisSummary.h
  include/AnnualAnalysisSummaryData.h
  include/MonthlyFacilityAnalysis.h
  include/MonthlyFacilityAnalysisData.h
)


include_directories(${CMAKE_SOURCE_DIR}/include)

add_library(verifi_analysis STATIC ${SOURCE_FILES} ${SOURCE_FILES_WASM} ${INCLUDE_FILES})

if( UNIX AND NOT APPLE )
  target_link_libraries( verifi_analysis dl )
endif()



add_executable(wasm-analysis ${SOURCE_FILES} ${SOURCE_FILES_WASM} ${INCLUDE_FILES})


