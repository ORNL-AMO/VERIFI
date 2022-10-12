#include "PredictorEntry.h"
#include <string>
#include <vector>

#ifndef ANALYSISGROUP_H
#define ANALYSISGROUP_H

class BaselineAdjustments
{
public:
    /**
     * @brief
     *
     */
    BaselineAdjustments(int year, double amount) : year(year), amount(amount){

                                                               };
    int year;
    double amount;
};

class AnalysisGroup
{

public:
    /**
     * @brief
     *
     */
    AnalysisGroup(){};

    AnalysisGroup(
        std::string analysisType,
        std::vector<PredictorData> predictorVariables,
        std::string idbGroupId,
        double regressionConstant,
        double averagePercentBaseload,
        bool hasBaselineAdjustment,
        std::vector<BaselineAdjustments> baselineAdjustments)
        : analysisType(analysisType),
          predictorVariables(predictorVariables),
          idbGroupId(idbGroupId),
          regressionConstant(regressionConstant),
          averagePercentBaseload(averagePercentBaseload),
          baselineAdjustments(baselineAdjustments),
          hasBaselineAdjustment(hasBaselineAdjustment){

          };

    std::string analysisType;
    std::vector<PredictorData> predictorVariables;
    std::string idbGroupId;
    double regressionConstant;
    double averagePercentBaseload;
    bool hasBaselineAdjustment;
    std::vector<BaselineAdjustments> baselineAdjustments;
};


#endif //ANALYSISGROUP_H