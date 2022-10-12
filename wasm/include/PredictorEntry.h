#include <string>
#include <vector>
#include "AnalysisDate.h"

#ifndef PREDICTORDATA_H
#define PREDICTORDATA_H

class PredictorData
{
public:
    /**
     * @brief
     *
     */
    PredictorData(){};
    PredictorData(
        bool productionInAnalysis,
        double amount,
        std::string id,
        double regressionCoefficient)
        : productionInAnalysis(productionInAnalysis), amount(amount), id(id), regressionCoefficient(regressionCoefficient){

                                                                              };
    bool productionInAnalysis;
    double amount;
    std::string id;
    double regressionCoefficient;
};

class PredictorEntry
{

public:
    /**
     * @brief
     *
     */
    PredictorEntry(){};
    PredictorEntry(
        std::string facilityId,
        std::vector<PredictorData> predictors,
        AnalysisDate date)
        : facilityId(facilityId), predictors(predictors), date(date){

                                                          };
    std::string facilityId;
    std::vector<PredictorData> predictors;
    AnalysisDate date;
};

#endif // PREDICTORDATA_H